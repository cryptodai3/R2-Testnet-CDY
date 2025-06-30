import "dotenv/config";
import blessed from "blessed";
import figlet from "figlet";
import { ethers } from "ethers";
import axios from "axios";
import FormData from "form-data";
import { v4 as uuid } from "uuid";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const APP_ID = "1356609826230243469";
const GUILD_ID = "1308368864505106442";
const COMMAND_ID = "1356665931056808211";
const COMMAND_VERSION = "1356665931056808212";
const initialProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const initialWallet = new ethers.Wallet(process.env.PRIVATE_KEY, initialProvider);
const wallet_address = initialWallet.address;
const MAX_LOGS = 100;
const DISPLAY_LOGS = 50;

const NETWORK_CHANNEL_IDS = {
  "Sepolia": "1339883019556749395"
};

const SEPOLIA_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  USDC_ADDRESS: process.env.USDC_ADDRESS,
  R2USD_ADDRESS: process.env.R2USD_ADDRESS,
  sR2USD_ADDRESS: process.env.sR2USD_ADDRESS,
  ROUTER_USDC_TO_R2USD: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  ROUTER_R2USD_TO_USDC: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
  STAKING_CONTRACT: "0x006CbF409CA275bA022111dB32BDAE054a97d488",
  LP_R2USD_sR2USD: "0xe85A06C238439F981c90b2C91393b2F3c46e27FC",
  LP_USDC_R2USD: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
  NETWORK_NAME: "Sepolia Testnet"
};

const SEPOLIA_R2_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  R2_ADDRESS: process.env.R2_ADDRESS,
  USDC_ADDRESS: process.env.R2_USDC_ADDRESS,
  R2USD_ADDRESS: process.env.R2_R2USD_ADDRESS,
  ROUTER_ADDRESS: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
  LP_R2_R2USD: "0x9Ae18109692b43e95Ae6BE5350A5Acc5211FE9a1", 
  LP_USDC_R2: "0xCdfDD7dD24bABDD05A2ff4dfcf06384c5Ad661a9", 
  NETWORK_NAME: "Sepolia R2 Testnet"
};

const DEBUG_MODE = false;

const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)"
];

const ROUTER_ABI = [
  {
    "inputs": [
      {"internalType":"uint256","name":"amountIn","type":"uint256"},
      {"internalType":"uint256","name":"amountOutMin","type":"uint256"},
      {"internalType":"address[]","name":"path","type":"address[]"},
      {"internalType":"address","name":"to","type":"address"},
      {"internalType":"uint256","name":"deadline","type":"uint256"}
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType":"address","name":"tokenA","type":"address"},
      {"internalType":"address","name":"tokenB","type":"address"},
      {"internalType":"uint256","name":"amountADesired","type":"uint256"},
      {"internalType":"uint256","name":"amountBDesired","type":"uint256"},
      {"internalType":"uint256","name":"amountAMin","type":"uint256"},
      {"internalType":"uint256","name":"amountBMin","type":"uint256"},
      {"internalType":"address","name":"to","type":"address"},
      {"internalType":"uint256","name":"deadline","type":"uint256"}
    ],
    "name": "addLiquidity",
    "outputs": [
      {"internalType":"uint256","name":"amountA","type":"uint256"},
      {"internalType":"uint256","name":"amountB","type":"uint256"},
      {"internalType":"uint256","name":"liquidity","type":"uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const LP_CONTRACT_ABI = [
  {
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "add_liquidity",
    "inputs": [
      {"name": "_amounts", "type": "uint256[]"},
      {"name": "_min_mint_amount", "type": "uint256"},
      {"name": "_receiver", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "calc_token_amount",
    "inputs": [
      {"name": "_amounts", "type": "uint256[]"},
      {"name": "_is_deposit", "type": "bool"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "arg0", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}]
  }
];

const LP_USDC_R2USD_ABI = [
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_balances",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256[]"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "calc_token_amount",
    "inputs": [
      {"name": "_amounts", "type": "uint256[]"},
      {"name": "_is_deposit", "type": "bool"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "add_liquidity",
    "inputs": [
      {"name": "_amounts", "type": "uint256[]"},
      {"name": "_min_mint_amount", "type": "uint256"},
      {"name": "_receiver", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  }
];

const randomAmountRanges = {
  "SWAP_R2USD_USDC": {
    USDC: { min: 50, max: 200 },
    R2USD: { min: 50, max: 200 }
  },
  "SWAP_R2_USDC": {
    USDC: { min: 50, max: 200 },
    R2: { min: 50, max: 200 }
  },
  "SWAP_R2_R2USD": {
    R2: { min: 50, max: 200 },
    R2USD: { min: 50, max: 200 }
  }
};

let currentNetwork = "Sepolia";
let walletInfoByNetwork = {
  "Sepolia": {
    address: wallet_address,
    balanceNative: "0.00",
    balanceUsdc: "0.00",
    balanceR2usd: "0.00",
    balanceSr2usd: "0.00",
    balanceLpR2usdSr2usd: "0.00",
    balanceLpUsdcR2usd: "0.00",
    network: SEPOLIA_CONFIG.NETWORK_NAME,
    status: "Initializing"
  },
  "Sepolia R2": {
    address: wallet_address,
    balanceNative: "0.00",
    balanceUsdc: "0.00",
    balanceR2: "0.00",
    balanceR2usd: "0.00",
    balanceLpR2R2usd: "0.00",
    balanceLpUsdcR2: "0.00",
    network: SEPOLIA_R2_CONFIG.NETWORK_NAME,
    status: "Initializing"
  }
};

let transactionLogs = [];
let MY_USER_ID = null;
let claimRunning = false;
let claimCancelled = false;
let dailyClaimInterval = null;
let runningActions = {
  "Sepolia": 0,
  "Sepolia R2": 0
};
let swapCancelled = {
  "Sepolia": false,
  "Sepolia R2": false
};
let transactionQueue = Promise.resolve();
let transactionQueueList = [];
let transactionIdCounter = 0;
let nextNonce = null;
let swapDirection = {
  "Sepolia": true,
  "Sepolia R2": true,
  "Sepolia R2_R2_R2USD": true
};

function getShortAddress(address) {
  return address ? address.slice(0, 6) + "..." + address.slice(-4) : "N/A";
}

function getShortHash(hash) {
  return hash ? hash.slice(0, 6) + "..." + hash.slice(-4) : "N/A";
}

function addLog(message, type, network = currentNetwork) {
  if (type === "debug" && !DEBUG_MODE) return;
  const timestamp = new Date().toLocaleTimeString();
  let coloredMessage = message;
  if (type === "swap") coloredMessage = `{bright-cyan-fg}${message}{/bright-cyan-fg}`;
  else if (type === "system") coloredMessage = `{bright-white-fg}${message}{/bright-white-fg}`;
  else if (type === "error") coloredMessage = `{bright-red-fg}${message}{/bright-red-fg}`;
  else if (type === "success") coloredMessage = `{bright-green-fg}${message}{/bright-green-fg}`;
  else if (type === "warning") coloredMessage = `{bright-yellow-fg}${message}{/bright-yellow-fg}`;
  else if (type === "debug") coloredMessage = `{bright-magenta-fg}${message}{/bright-magenta-fg}`;

  transactionLogs.push(`{bright-cyan-fg}[{/bright-cyan-fg} {bold}{magenta-fg}${timestamp}{/magenta-fg}{/bold} {bright-cyan-fg}]{/bright-cyan-fg} {bold}{bright-cyan-fg}[{/bright-cyan-fg}{magenta-fg}${network}{/magenta-fg}{bright-cyan-fg}]{/bright-cyan-fg}{/bold}{bold} ${coloredMessage}{/bold}`);

  if (transactionLogs.length > MAX_LOGS) {
    transactionLogs.shift();
  }

  updateLogs();
}

function getRandomDelay() {
  return Math.random() * (60000 - 30000) + 30000;
}

function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function updateLogs() {
  const logsToDisplay = transactionLogs.slice(-DISPLAY_LOGS);
  logsBox.setContent(logsToDisplay.join("\n"));
  logsBox.setScrollPerc(100);
  safeRender();
}

function clearTransactionLogs() {
  transactionLogs = [];
  logsBox.setContent("");
  logsBox.setScroll(0);
  updateLogs();
  safeRender();
  addLog("Transaction logs telah dihapus.", "system", currentNetwork);
}

async function fetchMyUserId() {
  if (MY_USER_ID) return MY_USER_ID;
  const res = await axios.get("https://discord.com/api/v9/users/@me", {
    headers: { Authorization: DISCORD_TOKEN }
  });
  MY_USER_ID = res.data.id;
  return MY_USER_ID;
}

async function delayWithCancel(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (claimCancelled) return false;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return true;
}

async function waitWithCancel(delay, type, network) {
  return Promise.race([
    new Promise(resolve => setTimeout(resolve, delay)),
    new Promise(resolve => {
      const interval = setInterval(() => {
        if (type === "swap" && swapCancelled[network]) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    })
  ]);
}

async function updateWalletData(network) {
  try {
    if (network === "Sepolia") {
      const config = SEPOLIA_CONFIG;
      const provider = new ethers.JsonRpcProvider(config.RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const [nativeBalance, usdcBalance, r2usdBalance, sr2usdBalance, lpR2usdSr2usdBalance, lpUsdcR2usdBalance] = await Promise.all([
        provider.getBalance(wallet.address),
        getTokenBalance(config.USDC_ADDRESS, provider, wallet),
        getTokenBalance(config.R2USD_ADDRESS, provider, wallet),
        getTokenBalance(config.sR2USD_ADDRESS, provider, wallet),
        getTokenBalance(config.LP_R2USD_sR2USD, provider, wallet),
        getTokenBalance(config.LP_USDC_R2USD, provider, wallet)
      ]);

      walletInfoByNetwork[network].balanceNative = ethers.formatEther(nativeBalance);
      walletInfoByNetwork[network].balanceUsdc = usdcBalance;
      walletInfoByNetwork[network].balanceR2usd = r2usdBalance;
      walletInfoByNetwork[network].balanceSr2usd = sr2usdBalance;
      walletInfoByNetwork[network].balanceLpR2usdSr2usd = lpR2usdSr2usdBalance;
      walletInfoByNetwork[network].balanceLpUsdcR2usd = lpUsdcR2usdBalance;

      if (nextNonce === null) {
        nextNonce = await provider.getTransactionCount(wallet.address, "pending");
      }

      walletInfoByNetwork[network].network = config.NETWORK_NAME;
      walletInfoByNetwork[network].status = "Active";
    } else if (network === "Sepolia R2") {
      const config = SEPOLIA_R2_CONFIG;
      const provider = new ethers.JsonRpcProvider(config.RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const [nativeBalance, usdcBalance, r2Balance, r2usdBalance, lpR2R2usdBalance, lpUsdcR2Balance] = await Promise.all([
        provider.getBalance(wallet.address),
        getTokenBalance(config.USDC_ADDRESS, provider, wallet),
        getTokenBalance(config.R2_ADDRESS, provider, wallet),
        getTokenBalance(config.R2USD_ADDRESS, provider, wallet),
        getTokenBalance(config.LP_R2_R2USD, provider, wallet),
        getTokenBalance(config.LP_USDC_R2, provider, wallet)
      ]);

      walletInfoByNetwork[network].balanceNative = ethers.formatEther(nativeBalance);
      walletInfoByNetwork[network].balanceUsdc = usdcBalance;
      walletInfoByNetwork[network].balanceR2 = r2Balance;
      walletInfoByNetwork[network].balanceR2usd = r2usdBalance;
      walletInfoByNetwork[network].balanceLpR2R2usd = lpR2R2usdBalance;
      walletInfoByNetwork[network].balanceLpUsdcR2 = lpUsdcR2Balance;

      if (nextNonce === null) {
        nextNonce = await provider.getTransactionCount(wallet.address, "pending");
      }

      walletInfoByNetwork[network].network = config.NETWORK_NAME;
      walletInfoByNetwork[network].status = "Active";
    }

    updateWallet();
    addLog("Wallet Information Updated !!", "success", network);
  } catch (error) {
    addLog(`Gagal memperbarui data wallet untuk ${network}: ${error.message}`, "error", network);
  }
}

async function getTokenBalance(tokenAddress, provider, wallet) {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    const balance = await contract.balanceOf(wallet.address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    addLog(`Gagal mengambil saldo token ${tokenAddress}: ${error.message}`, "error", currentNetwork);
    return "0";
  }
}

function updateWallet() {
  const walletInfo = walletInfoByNetwork[currentNetwork];
  const shortAddress = getShortAddress(walletInfo.address);
  const nativeBalance = Number(walletInfo.balanceNative).toFixed(4);
  const usdc = Number(walletInfo.balanceUsdc).toFixed(4);
  const r2usd = Number(walletInfo.balanceR2usd).toFixed(4);
  let content;

  if (currentNetwork === "Sepolia") {
    const sr2usd = Number(walletInfo.balanceSr2usd).toFixed(4);
    const lpR2usdSr2usd = Number(walletInfo.balanceLpR2usdSr2usd).toFixed(4);
    const lpUsdcR2usd = Number(walletInfo.balanceLpUsdcR2usd).toFixed(4);

    content = `┌── Address   : {bright-yellow-fg}${shortAddress}{/bright-yellow-fg}
│   ├── ETH           : {bright-green-fg}${nativeBalance}{/bright-green-fg}
│   ├── USDC          : {bright-green-fg}${usdc}{/bright-green-fg}
│   ├── R2USD         : {bright-green-fg}${r2usd}{/bright-green-fg}
│   ├── sR2USD        : {bright-green-fg}${sr2usd}{/bright-green-fg}
│   ├── LP R2USD-sR2USD : {bright-green-fg}${lpR2usdSr2usd}{/bright-green-fg}
│   └── LP USDC-R2USD   : {bright-green-fg}${lpUsdcR2usd}{/bright-green-fg}
└── Network        : {bright-cyan-fg}${walletInfo.network}{/bright-cyan-fg}`;
  } else {
    const r2 = Number(walletInfo.balanceR2).toFixed(4);
    const lpR2R2usd = Number(walletInfo.balanceLpR2R2usd).toFixed(4);
    const lpUsdcR2 = Number(walletInfo.balanceLpUsdcR2).toFixed(4);

    content = `┌── Address   : {bright-yellow-fg}${shortAddress}{/bright-yellow-fg}
│   ├── ETH           : {bright-green-fg}${nativeBalance}{/bright-green-fg}
│   ├── USDC          : {bright-green-fg}${usdc}{/bright-green-fg}
│   ├── R2            : {bright-green-fg}${r2}{/bright-green-fg}
│   ├── R2USD         : {bright-green-fg}${r2usd}{/bright-green-fg}
│   ├── LP R2-R2USD   : {bright-green-fg}${lpR2R2usd}{/bright-green-fg}
│   └── LP USDC-R2    : {bright-green-fg}${lpUsdcR2}{/bright-green-fg}
└── Network        : {bright-cyan-fg}${walletInfo.network}{/bright-cyan-fg}`;
  }

  walletBox.setContent(content);
  safeRender();
}

async function ensureApproval(tokenAddress, spender, amount, wallet, network) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  let allowance = await tokenContract.allowance(wallet.address, spender);
  allowance = BigInt(allowance.toString());
  const amountBigInt = BigInt(amount.toString());

  if (allowance < amountBigInt) {
    const approveAmount = ethers.parseUnits("1000000", 6);
    addLog(`Approving ${ethers.formatUnits(approveAmount, 6)} tokens untuk ${spender}`, "system", network);
    const approveTx = await tokenContract.approve(spender, approveAmount);
    await approveTx.wait();
    addLog(`Approval berhasil untuk ${spender}`, "success", network);
  }
}

async function checkContractPaused(contractAddress, provider, network) {
  const contract = new ethers.Contract(contractAddress, ["function paused() view returns (bool)"], provider);
  try {
    const paused = await contract.paused();
    return paused;
  } catch (error) {
    addLog(`Kontrak ${contractAddress} tidak memiliki fungsi paused() atau gagal: ${error.message}`, "warning", network);
    return false;
  }
}

async function swapUsdcToR2usd(amountUsdc, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountUsdc.toString(), 6);
  const routerContractAddress = config.ROUTER_USDC_TO_R2USD;

  const isPaused = await checkContractPaused(routerContractAddress, provider, network);
  if (isPaused) throw new Error("Kontrak dalam status paused, swap tidak dapat dilakukan");

  const usdcContract = new ethers.Contract(config.USDC_ADDRESS, ERC20ABI, provider);
  let balance = await usdcContract.balanceOf(wallet.address);
  balance = BigInt(balance.toString());

  if (balance < amount) throw new Error(`Saldo USDC tidak cukup: ${ethers.formatUnits(balance, 6)} USDC`);

  await ensureApproval(config.USDC_ADDRESS, routerContractAddress, amount, wallet, network);

  const methodId = "0x095e7a95";
  const data = ethers.concat([
    methodId,
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
      [wallet.address, amount, 0, 0, 0, 0, 0]
    ),
  ]);

  const tx = await wallet.sendTransaction({
    to: routerContractAddress,
    data: data,
    gasLimit: 500000,
    nonce: nonce,
  });

  return tx;
}

async function swapR2usdToUsdc(amountR2usd, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const routerContractAddress = config.ROUTER_R2USD_TO_USDC;

  const r2usdContract = new ethers.Contract(config.R2USD_ADDRESS, ERC20ABI, provider);
  let balance = await r2usdContract.balanceOf(wallet.address);
  balance = BigInt(balance.toString());

  if (balance < amount) throw new Error(`Saldo R2USD tidak cukup: ${ethers.formatUnits(balance, 6)} R2USD`);

  await ensureApproval(config.R2USD_ADDRESS, routerContractAddress, amount, wallet, network);

  const slippage = 0.97;
  const minDy = ethers.parseUnits((parseFloat(amountR2usd) * slippage).toFixed(6), 6);

  const methodId = "0x3df02124";
  const data = ethers.concat([
    methodId,
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["int128", "int128", "uint256", "uint256"],
      [0, 1, amount, minDy]
    ),
  ]);

  const tx = await wallet.sendTransaction({
    to: routerContractAddress,
    data: data,
    gasLimit: 500000,
    nonce: nonce,
  });

  return tx;
}

async function swapR2ToUsdc(amountR2, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountR2.toString(), 18);
  const routerContractAddress = config.ROUTER_ADDRESS;

  const r2Contract = new ethers.Contract(config.R2_ADDRESS, ERC20ABI, provider);
  let balance = await r2Contract.balanceOf(wallet.address);
  balance = BigInt(balance.toString());

  if (balance < amount) throw new Error(`Saldo R2 tidak cukup: ${ethers.formatUnits(balance, 18)} R2`);

  await ensureApproval(config.R2_ADDRESS, routerContractAddress, amount, wallet, network);

  const routerContract = new ethers.Contract(routerContractAddress, ROUTER_ABI, wallet);
  const path = [config.R2_ADDRESS, config.USDC_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await routerContract.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { nonce }
  );

  return tx;
}

async function swapUsdcToR2(amountUsdc, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountUsdc.toString(), 6);
  const routerContractAddress = config.ROUTER_ADDRESS;

  const usdcContract = new ethers.Contract(config.USDC_ADDRESS, ERC20ABI, provider);
  let balance = await usdcContract.balanceOf(wallet.address);
  balance = BigInt(balance.toString());

  if (balance < amount) throw new Error(`Saldo USDC tidak cukup: ${ethers.formatUnits(balance, 6)} USDC`);

  await ensureApproval(config.USDC_ADDRESS, routerContractAddress, amount, wallet, network);

  const routerContract = new ethers.Contract(routerContractAddress, ROUTER_ABI, wallet);
  const path = [config.USDC_ADDRESS, config.R2_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await routerContract.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { nonce }
  );

  return tx;
}

async function swapR2ToR2usd(amountR2, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountR2.toString(), 18);
  const routerContractAddress = config.ROUTER_ADDRESS;

  const r2Contract = new ethers.Contract(config.R2_ADDRESS, ERC20ABI, provider);
  let balance = await r2Contract.balanceOf(wallet.address);
  balance = BigInt(balance.toString());

  if (balance < amount) throw new Error(`Saldo R2 tidak cukup: ${ethers.formatUnits(balance, 18)} R2`);

  await ensureApproval(config.R2_ADDRESS, routerContractAddress, amount, wallet, network);

  const routerContract = new ethers.Contract(routerContractAddress, ROUTER_ABI, wallet);
  const path = [config.R2_ADDRESS, config.R2USD_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await routerContract.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { nonce }
  );

  return tx;
}

async function swapR2usdToR2(amountR2usd, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const routerContractAddress = config.ROUTER_ADDRESS;

  const r2usdContract = new ethers.Contract(config.R2USD_ADDRESS, ERC20ABI, provider);
  let balance = await r2usdContract.balanceOf(wallet.address);
  balance = BigInt(balance.toString());

  if (balance < amount) throw new Error(`Saldo R2USD tidak cukup: ${ethers.formatUnits(balance, 6)} R2USD`);

  await ensureApproval(config.R2USD_ADDRESS, routerContractAddress, amount, wallet, network);

  const routerContract = new ethers.Contract(routerContractAddress, ROUTER_ABI, wallet);
  const path = [config.R2USD_ADDRESS, config.R2_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await routerContract.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { nonce }
  );

  return tx;
}

async function addLpR2Usdc(amountR2, amountUsdc, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amountR2Wei = ethers.parseUnits(amountR2.toString(), 18);
  const amountUsdcWei = ethers.parseUnits(amountUsdc.toString(), 6);
  const routerContractAddress = config.ROUTER_ADDRESS;

  const r2Contract = new ethers.Contract(config.R2_ADDRESS, ERC20ABI, provider);
  const usdcContract = new ethers.Contract(config.USDC_ADDRESS, ERC20ABI, provider);

  let balanceR2 = await r2Contract.balanceOf(wallet.address);
  let balanceUsdc = await usdcContract.balanceOf(wallet.address);
  balanceR2 = BigInt(balanceR2.toString());
  balanceUsdc = BigInt(balanceUsdc.toString());

  if (balanceR2 < amountR2Wei) throw new Error(`Saldo R2 tidak cukup: ${ethers.formatUnits(balanceR2, 18)} R2`);
  if (balanceUsdc < amountUsdcWei) throw new Error(`Saldo USDC tidak cukup: ${ethers.formatUnits(balanceUsdc, 6)} USDC`);

  await ensureApproval(config.R2_ADDRESS, routerContractAddress, amountR2Wei, wallet, network);
  await ensureApproval(config.USDC_ADDRESS, routerContractAddress, amountUsdcWei, wallet, network);

  const routerContract = new ethers.Contract(routerContractAddress, ROUTER_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountAMin = 0;
  const amountBMin = 0;

  const tx = await routerContract.addLiquidity(
    config.R2_ADDRESS,
    config.USDC_ADDRESS,
    amountR2Wei,
    amountUsdcWei,
    amountAMin,
    amountBMin,
    wallet.address,
    deadline,
    { nonce }
  );

  return tx;
}

async function addLpR2R2usd(amountR2, amountR2usd, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amountR2Wei = ethers.parseUnits(amountR2.toString(), 18);
  const amountR2usdWei = ethers.parseUnits(amountR2usd.toString(), 6);
  const routerContractAddress = config.ROUTER_ADDRESS;

  const r2Contract = new ethers.Contract(config.R2_ADDRESS, ERC20ABI, provider);
  const r2usdContract = new ethers.Contract(config.R2USD_ADDRESS, ERC20ABI, provider);

  let balanceR2 = await r2Contract.balanceOf(wallet.address);
  let balanceR2usd = await r2usdContract.balanceOf(wallet.address);
  balanceR2 = BigInt(balanceR2.toString());
  balanceR2usd = BigInt(balanceR2usd.toString());

  if (balanceR2 < amountR2Wei) throw new Error(`Saldo R2 tidak cukup: ${ethers.formatUnits(balanceR2, 18)} R2`);
  if (balanceR2usd < amountR2usdWei) throw new Error(`Saldo R2USD tidak cukup: ${ethers.formatUnits(balanceR2usd, 6)} R2USD`);

  await ensureApproval(config.R2_ADDRESS, routerContractAddress, amountR2Wei, wallet, network);
  await ensureApproval(config.R2USD_ADDRESS, routerContractAddress, amountR2usdWei, wallet, network);

  const routerContract = new ethers.Contract(routerContractAddress, ROUTER_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountAMin = 0;
  const amountBMin = 0;

  const tx = await routerContract.addLiquidity(
    config.R2_ADDRESS,
    config.R2USD_ADDRESS,
    amountR2Wei,
    amountR2usdWei,
    amountAMin,
    amountBMin,
    wallet.address,
    deadline,
    { nonce }
  );

  return tx;
}

async function autoSwapR2usdUsdc(network) {
  const ranges = randomAmountRanges["SWAP_R2USD_USDC"];
  let amount;
  let txPromise;
  let currentDirection = swapDirection[network];

  if (currentDirection) {
    amount = getRandomNumber(ranges["USDC"].min, ranges["USDC"].max).toFixed(6);
    addLog(`Mencoba swap: ${amount} USDC ke R2USD`, "swap", network);
    txPromise = addTransactionToQueue(
      (nonce, wallet, provider, config) => swapUsdcToR2usd(amount, nonce, wallet, provider, config),
      `Swap ${amount} USDC to R2USD`,
      network
    );
  } else {
    amount = getRandomNumber(ranges["R2USD"].min, ranges["R2USD"].max).toFixed(6);
    addLog(`Mencoba swap: ${amount} R2USD ke USDC`, "swap", network);
    txPromise = addTransactionToQueue(
      (nonce, wallet, provider, config) => swapR2usdToUsdc(amount, nonce, wallet, provider, config),
      `Swap ${amount} R2USD to USDC`,
      network
    );
  }

  const result = await txPromise;
  if (result && result.receipt && result.receipt.status === 1) {
    swapDirection[network] = !currentDirection;
  }
  return result;
}

async function autoSwapR2Usdc(network) {
  const ranges = randomAmountRanges["SWAP_R2_USDC"];
  let amount;
  let txPromise;
  let currentDirection = swapDirection[network];

  if (currentDirection) {
    amount = getRandomNumber(ranges["USDC"].min, ranges["USDC"].max).toFixed(6);
    addLog(`Mencoba swap: ${amount} USDC ke R2`, "swap", network);
    txPromise = addTransactionToQueue(
      (nonce, wallet, provider, config) => swapUsdcToR2(amount, nonce, wallet, provider, config),
      `Swap ${amount} USDC to R2`,
      network
    );
  } else {
    amount = getRandomNumber(ranges["R2"].min, ranges["R2"].max).toFixed(6);
    addLog(`Mencoba swap: ${amount} R2 ke USDC`, "swap", network);
    txPromise = addTransactionToQueue(
      (nonce, wallet, provider, config) => swapR2ToUsdc(amount, nonce, wallet, provider, config),
      `Swap ${amount} R2 to USDC`,
      network
    );
  }

  const result = await txPromise;
  if (result && result.receipt && result.receipt.status === 1) {
    swapDirection[network] = !currentDirection;
  }
  return result;
}

async function autoSwapR2R2usd(network) {
  const ranges = randomAmountRanges["SWAP_R2_R2USD"];
  let amount;
  let txPromise;
  let currentDirection = swapDirection["Sepolia R2_R2_R2USD"];

  if (currentDirection) {
    amount = getRandomNumber(ranges["R2"].min, ranges["R2"].max).toFixed(6);
    addLog(`Mencoba swap: ${amount} R2 ke R2USD`, "swap", network);
    txPromise = addTransactionToQueue(
      (nonce, wallet, provider, config) => swapR2ToR2usd(amount, nonce, wallet, provider, config),
      `Swap ${amount} R2 to R2USD`,
      network
    );
  } else {
    amount = getRandomNumber(ranges["R2USD"].min, ranges["R2USD"].max).toFixed(6);
    addLog(`Mencoba swap: ${amount} R2USD ke R2`, "swap", network);
    txPromise = addTransactionToQueue(
      (nonce, wallet, provider, config) => swapR2usdToR2(amount, nonce, wallet, provider, config),
      `Swap ${amount} R2USD to R2`,
      network
    );
  }

  const result = await txPromise;
  if (result && result.receipt && result.receipt.status === 1) {
    swapDirection["Sepolia R2_R2_R2USD"] = !currentDirection;
  }
  return result;
}

async function autoStakeR2usdSr2usd(amountR2usd, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const stakingContractAddress = config.STAKING_CONTRACT;

  const r2usdContract = new ethers.Contract(config.R2USD_ADDRESS, ERC20ABI, provider);
  let balance = await r2usdContract.balanceOf(wallet.address);
  balance = BigInt(balance.toString());

  if (balance < amount) throw new Error(`Saldo R2USD tidak cukup: ${ethers.formatUnits(balance, 6)} R2USD`);

  await ensureApproval(config.R2USD_ADDRESS, stakingContractAddress, amount, wallet, network);

  const methodId = "0x1a5f0f00";
  const data = ethers.concat([
    methodId,
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256", "uint256", "uint8", "uint256", "uint256"],
      [amount, 0, 0, 0, 0, 0]
    ),
  ]);

  const tx = await wallet.sendTransaction({
    to: stakingContractAddress,
    data: data,
    gasLimit: 100000,
    nonce: nonce,
  });

  return tx;
}

async function autoAddLpR2usdSr2usd(amountR2usd, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const amountSr2usdWei = amount;
  const lpContractAddress = config.LP_R2USD_sR2USD;

  const r2usdContract = new ethers.Contract(config.R2USD_ADDRESS, ERC20ABI, provider);
  const sr2usdContract = new ethers.Contract(config.sR2USD_ADDRESS, ERC20ABI, provider);

  let balanceR2usd = await r2usdContract.balanceOf(wallet.address);
  let balanceSr2usd = await sr2usdContract.balanceOf(wallet.address);
  balanceR2usd = BigInt(balanceR2usd.toString());
  balanceSr2usd = BigInt(balanceSr2usd.toString());

  if (balanceR2usd < amount) throw new Error(`Saldo R2USD tidak cukup: ${ethers.formatUnits(balanceR2usd, 6)} R2USD`);
  if (balanceSr2usd < amountSr2usdWei) throw new Error(`Saldo sR2USD tidak cukup: ${ethers.formatUnits(balanceSr2usd, 6)} sR2USD`);

  await ensureApproval(config.R2USD_ADDRESS, lpContractAddress, amount, wallet, network);
  await ensureApproval(config.sR2USD_ADDRESS, lpContractAddress, amountSr2usdWei, wallet, network);

  const lpContract = new ethers.Contract(lpContractAddress, LP_CONTRACT_ABI, wallet);
  const estimatedLpTokens = await lpContract.calc_token_amount([amountSr2usdWei, amount], true);
  const minMintAmount = BigInt(Math.floor(Number(estimatedLpTokens) * 0.99));

  const tx = await lpContract.add_liquidity([amountSr2usdWei, amount], minMintAmount, wallet.address, { nonce });
  return tx;
}

async function autoAddLpUsdcR2usd(amountUsdc, nonce, wallet, provider, config) {
  const network = config.NETWORK_NAME;
  const amount = ethers.parseUnits(amountUsdc.toFixed(6), 6);
  const amountR2usdWei = amount;
  const lpContractAddress = config.LP_USDC_R2USD;

  const usdcContract = new ethers.Contract(config.USDC_ADDRESS, ERC20ABI, provider);
  const r2usdContract = new ethers.Contract(config.R2USD_ADDRESS, ERC20ABI, provider);

  let balanceUsdc = await usdcContract.balanceOf(wallet.address);
  let balanceR2usd = await r2usdContract.balanceOf(wallet.address);
  balanceUsdc = BigInt(balanceUsdc.toString());
  balanceR2usd = BigInt(balanceR2usd.toString());

  if (balanceUsdc < amount) throw new Error(`Saldo USDC tidak cukup: ${ethers.formatUnits(balanceUsdc, 6)} USDC`);
  if (balanceR2usd < amountR2usdWei) throw new Error(`Saldo R2USD tidak cukup: ${ethers.formatUnits(balanceR2usd, 6)} R2USD`);

  await ensureApproval(config.USDC_ADDRESS, lpContractAddress, amount, wallet, network);
  await ensureApproval(config.R2USD_ADDRESS, lpContractAddress, amountR2usdWei, wallet, network);

  const lpContract = new ethers.Contract(lpContractAddress, LP_USDC_R2USD_ABI, wallet);
  const estimatedLpTokens = await lpContract.calc_token_amount([amountR2usdWei, amount], true);
  const minMintAmount = BigInt(Math.floor(Number(estimatedLpTokens) * 0.99));

  const tx = await lpContract.add_liquidity([amountR2usdWei, amount], minMintAmount, wallet.address, { nonce });
  return tx;
}

async function runAutoAction(actionFunction, actionName, network) {
  promptBox.setFront();
  if (actionName.includes("Stake") || actionName.includes("Add LP")) {
    promptBox.input(`Masukkan jumlah untuk ${actionName}`, "", async (err, value) => {
      promptBox.hide();
      safeRender();
      if (err || !value) {
        addLog(`${actionName}: Input tidak valid atau dibatalkan.`, "swap", network);
        return;
      }
      const amount = parseFloat(value);
      if (isNaN(amount) || amount <= 0) {
        addLog(`${actionName}: Jumlah harus lebih besar dari 0.`, "swap", network);
        return;
      }
      if (runningActions[network] > 0) {
        addLog(`${actionName}: Tidak dapat dimulai karena ada transaksi berjalan di ${network}. Hentikan dulu transaksi yang ada.`, "warning", network);
        return;
      }
      runningActions[network]++;
      swapCancelled[network] = false;
      mainMenu.setItems(getMainMenItems());
      if (network === "Sepolia") {
        sepoliaSubMenu.setItems(getSepoliaSubMenuItems());
      } else {
        sepoliaR2SubMenu.setItems(getSepoliaR2SubMenuItems());
      }
      safeRender();
      try {
        if (network === "Sepolia R2") {
          if (actionName === "Auto Add LP R2 & R2USD") {
            await addTransactionToQueue(
              (nonce, wallet, provider, config) => addLpR2R2usd(amount, amount, nonce, wallet, provider, config),
              `Add LP R2 & R2USD ${amount}`,
              network
            );
          } else if (actionName === "Auto Add LP USDC & R2") {
            await addTransactionToQueue(
              (nonce, wallet, provider, config) => addLpR2Usdc(amount, amount, nonce, wallet, provider, config),
              `Add LP USDC & R2 ${amount}`,
              network
            );
          }
        } else if (network === "Sepolia") {
          await addTransactionToQueue(
            actionName.includes("Stake") ?
              (nonce, wallet, provider, config) => autoStakeR2usdSr2usd(amount, nonce, wallet, provider, config) :
              actionName.includes("USDC & R2USD") ?
                (nonce, wallet, provider, config) => autoAddLpUsdcR2usd(amount, nonce, wallet, provider, config) :
                (nonce, wallet, provider, config) => autoAddLpR2usdSr2usd(amount, nonce, wallet, provider, config),
            `${actionName} ${amount}`,
            network
          );
        }
        await updateWalletData(network);
        addLog(`${actionName}: Selesai untuk ${amount}.`, "success", network);
      } catch (error) {
        addLog(`${actionName}: Gagal - ${error.message}`, "error", network);
      } finally {
        runningActions[network]--;
        mainMenu.setItems(getMainMenItems());
        if (network === "Sepolia") {
          sepoliaSubMenu.setItems(getSepoliaSubMenuItems());
        } else {
          sepoliaR2SubMenu.setItems(getSepoliaR2SubMenuItems());
        }
        safeRender();
      }
    });
  } else {
    promptBox.readInput(`Masukkan jumlah Swap untuk ${actionName}`, "", async (err, value) => {
      promptBox.hide();
      safeRender();
      if (err || !value) {
        addLog(`${actionName}: Input tidak valid atau dibatalkan.`, "swap", network);
        return;
      }
      const loopCount = parseInt(value);
      if (isNaN(loopCount) || loopCount <= 0) {
        addLog(`${actionName}: Jumlah harus berupa angka positif.`, "swap", network);
        return;
      }
      if (runningActions[network] > 0) {
        addLog(`${actionName}: Tidak dapat dimulai karena ada transaksi berjalan di ${network}. Hentikan dulu transaksi yang ada.`, "warning", network);
        return;
      }
      runningActions[network]++;
      swapCancelled[network] = false;
      mainMenu.setItems(getMainMenItems());
      if (network === "Sepolia") {
        sepoliaSubMenu.setItems(getSepoliaSubMenuItems());
      } else {
        sepoliaR2SubMenu.setItems(getSepoliaR2SubMenuItems());
      }
      safeRender();
      try {
        for (let i = 1; i <= loopCount; i++) {
          if (swapCancelled[network]) {
            addLog(`${actionName}: Dihentikan pada Swap ${i}.`, "swap", network);
            break;
          }
          addLog(`Memulai Swap ke-${i}`, "swap", network);
          const success = await actionFunction(network);
          if (success) await updateWalletData(network);
          if (i < loopCount) {
            const delayTime = getRandomDelay();
            const minutes = Math.floor(delayTime / 60000);
            const seconds = Math.floor((delayTime % 60000) / 1000);
            addLog(`Swap ke-${i} selesai. Menunggu ${minutes} menit ${seconds} detik.`, "swap", network);
            await waitWithCancel(delayTime, "swap", network);
          }
        }
      } finally {
        runningActions[network]--;
        mainMenu.setItems(getMainMenItems());
        if (network === "Sepolia") {
          sepoliaSubMenu.setItems(getSepoliaSubMenuItems());
        } else {
          sepoliaR2SubMenu.setItems(getSepoliaR2SubMenuItems());
        }
        safeRender();
        addLog(`${actionName}: Selesai.`, "swap", network);
      }
    });
  }
}

async function addTransactionToQueue(transactionFunction, description = "Transaksi", network) {
  const transactionId = ++transactionIdCounter;
  transactionQueueList.push({
    id: transactionId,
    description,
    timestamp: new Date().toLocaleTimeString(),
    status: "queued"
  });
  addLog(`Transaksi [${transactionId}] ditambahkan ke antrean: ${description}`, "system", network);
  updateQueueDisplay();

  transactionQueue = transactionQueue.then(async () => {
    updateTransactionStatus(transactionId, "processing");
    try {
      const config = network === "Sepolia" ? SEPOLIA_CONFIG : SEPOLIA_R2_CONFIG;
      const provider = new ethers.JsonRpcProvider(config.RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const currentNonce = await provider.getTransactionCount(wallet.address, "pending");
      nextNonce = currentNonce;

      const tx = await transactionFunction(nextNonce, wallet, provider, config);
      const txHash = tx.hash;
      addLog(`Transaksi Dikirim. Hash: ${getShortHash(txHash)}`, "warning", network);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        updateTransactionStatus(transactionId, "completed");
        addLog(`Transaksi Selesai. Hash: ${getShortHash(receipt.transactionHash || txHash)}`, "success", network);
        nextNonce++;
      } else {
        updateTransactionStatus(transactionId, "failed");
        addLog(`Transaksi [${transactionId}] gagal: Transaksi ditolak oleh kontrak.`, "error", network);
        nextNonce = null;
      }
      return { receipt, txHash, tx };
    } catch (error) {
      updateTransactionStatus(transactionId, "error");
      addLog(`Transaksi [${transactionId}] gagal: ${error.message}`, "error", network);
      nextNonce = null;
      return null;
    } finally {
      removeTransactionFromQueue(transactionId);
      updateQueueDisplay();
    }
  });
  return transactionQueue;
}

async function claimSepoliaFaucetWithDelay({ isDailyClaim = false } = {}) {
  claimRunning = true;
  claimCancelled = false;
  claimFaucetSubMenu.setItems(getClaimFaucetSubMenuItems());
  safeRender();

  await claimFaucet("Sepolia");

  claimRunning = false;
  if (isDailyClaim) {
    addLog("Auto Daily Claim Faucet selesai, menunggu 24 jam.", "swap", "Sepolia");
  } else {
    addLog("Claim Faucet selesai.", "success", "Sepolia");
  }
  claimFaucetSubMenu.setItems(getClaimFaucetSubMenuItems());
  safeRender();
}

function startAutoDailyClaim() {
  if (dailyClaimInterval) {
    addLog("Auto Daily Claim Faucet Sepolia sudah berjalan.", "warning");
    return;
  }
  dailyClaimInterval = setInterval(() => {
    if (!claimRunning) claimSepoliaFaucetWithDelay({ isDailyClaim: true });
  }, 86400000);
  claimSepoliaFaucetWithDelay({ isDailyClaim: true });
  addLog("Auto Daily Claim Faucet Sepolia dimulai.", "system");
}

function stopAutoDailyClaim() {
  if (dailyClaimInterval) {
    clearInterval(dailyClaimInterval);
    dailyClaimInterval = null;
    addLog("Auto Daily Claim Faucet Sepolia dihentikan.", "system");
  }
  if (claimRunning) {
    claimCancelled = true;
    addLog("Proses claim faucet dihentikan.", "system");
  }
  claimFaucetSubMenu.setItems(getClaimFaucetSubMenuItems());
  safeRender();
}

async function claimFaucet(network) {
  try {
    if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN tidak ditemukan di .env.");
    if (!wallet_address) throw new Error("Wallet address tidak tersedia.");

    const channelId = NETWORK_CHANNEL_IDS[network];
    if (!channelId) throw new Error(`Jaringan ${network} tidak didukung.`);

    const userId = await fetchMyUserId();
    const payload = {
      type: 2,
      application_id: APP_ID,
      guild_id: GUILD_ID,
      channel_id: channelId,
      session_id: uuid(),
      data: {
        version: COMMAND_VERSION,
        id: COMMAND_ID,
        name: "faucet",
        type: 1,
        options: [{ type: 3, name: "address", value: wallet_address }]
      },
      nonce: Date.now().toString()
    };
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));

    await axios.post("https://discord.com/api/v9/interactions", form, {
      headers: { Authorization: DISCORD_TOKEN, ...form.getHeaders() }
    });
    addLog(`Command Claiming Faucet Sent...`, "swap", network);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const res = await axios.get(
      `https://discord.com/api/v9/channels/${channelId}/messages?limit=10`,
      { headers: { Authorization: DISCORD_TOKEN } }
    );
    const messages = res.data;
    const myResponse = messages.find(m => m.author.id === APP_ID && m.interaction?.user?.id === userId);

    if (!myResponse) {
      addLog(`No Response Claiming ${network}.`, "warning", network);
      return;
    }

    const txt = myResponse.content || "";
    if (txt.includes("successfully")) {
      addLog(`Claiming Faucet ${network} Successfully`, "success", network);
    } else if (txt.toLowerCase().includes("claim failed")) {
      addLog(`${txt.split("\n")[0]}`, "warning", network);
    } else {
      addLog(`Unknown Status Claim at ${network}: ${txt}`, "system", network);
    }
  } catch (error) {
    addLog(`Error: ${error.message}`, "error", network);
  }
}

function updateTransactionStatus(id, status) {
  transactionQueueList.forEach(tx => {
    if (tx.id === id) tx.status = status;
  });
  updateQueueDisplay();
}

function removeTransactionFromQueue(id) {
  transactionQueueList = transactionQueueList.filter(tx => tx.id !== id);
  updateQueueDisplay();
}

function getTransactionQueueContent() {
  if (transactionQueueList.length === 0) return "Tidak ada transaksi dalam antrean.";
  return transactionQueueList.map(tx => `ID: ${tx.id} | ${tx.description} | ${tx.status} | ${tx.timestamp}`).join("\n");
}

let queueMenuBox = null;
let queueUpdateInterval = null;

function showTransactionQueueMenu() {
  const container = blessed.box({
    label: " Antrian Transaksi ",
    top: "10%",
    left: "center",
    width: "80%",
    height: "80%",
    border: { type: "line" },
    style: { border: { fg: "blue" } },
    keys: true,
    mouse: true,
    interactive: true
  });
  const contentBox = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: "90%",
    content: getTransactionQueueContent(),
    scrollable: true,
    keys: true,
    mouse: true,
    alwaysScroll: true,
    scrollbar: { ch: " ", inverse: true, style: { bg: "blue" } }
  });
  const exitButton = blessed.button({
    content: " [Keluar] ",
    bottom: 0,
    left: "center",
    shrink: true,
    padding: { left: 1, right: 1 },
    style: { fg: "white", bg: "red", hover: { bg: "blue" } },
    mouse: true,
    keys: true,
    interactive: true
  });
  exitButton.on("press", () => {
    addLog("Keluar Dari Menu Antrian Transaksi.", "system", currentNetwork);
    clearInterval(queueUpdateInterval);
    container.destroy();
    queueMenuBox = null;
    mainMenu.show();
    mainMenu.focus();
    screen.render();
  });
  container.append(contentBox);
  container.append(exitButton);
  queueUpdateInterval = setInterval(() => {
    contentBox.setContent(getTransactionQueueContent());
    screen.render();
  }, 1000);
  mainMenu.hide();
  screen.append(container);
  container.focus();
  screen.render();
}

function updateQueueDisplay() {
  if (queueMenuBox) {
    queueMenuBox.setContent(getTransactionQueueContent());
    screen.render();
  }
}

const screen = blessed.screen({
  smartCSR: true,
  title: "R2 Auto Bot",
  fullUnicode: true,
  mouse: true
});

let renderTimeout;

function safeRender() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => { screen.render(); }, 50);
}

const headerBox = blessed.box({
  top: 0,
  left: "center",
  width: "100%",
  tags: true,
  style: { fg: "white", bg: "default" }
});

figlet.text("YetiDAO".toUpperCase(), { font: "ANSI Shadow" }, (err, data) => {
  if (err) headerBox.setContent("{center}{bold}YetiDAO{/bold}{/center}");
  else headerBox.setContent(`{center}{bold}{bright-cyan-fg}${data}{/bright-cyan-fg}{/bold}{/center}`);
  safeRender();
});

const descriptionBox = blessed.box({
  left: "center",
  width: "100%",
  content: "{center}{bold}{grey-fg}________________________________________________________________________{/grey-fg}{/bold}{/center}",
  tags: true,
  style: { fg: "white", bg: "default" }
});

const logsBox = blessed.box({
  label: " Transaction Logs ",
  left: 0,
  border: { type: "line" },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  keys: true,
  vi: true,
  tags: true,
  style: { border: { fg: "yellow" }, fg: "white" },
  scrollbar: { ch: " ", inverse: true, style: { bg: "blue" } },
  content: ""
});

const welcomeBox = blessed.box({
  label: " Dashboard ",
  border: { type: "line" },
  tags: true,
  style: { border: { fg: "cyan" }, fg: "white", bg: "default" },
  content: "{center}{bold}Initializing...{/bold}{/center}"
});

const walletBox = blessed.box({
  label: " Informasi Wallet ",
  border: { type: "line" },
  tags: true,
  style: { border: { fg: "magenta" }, fg: "white", bg: "default" },
  content: "Loading data wallet..."
});

walletBox.hide();

const mainMenu = blessed.list({
  label: " Menu ",
  left: "60%",
  keys: true,
  vi: true,
  mouse: true,
  border: { type: "line" },
  style: { fg: "white", bg: "default", border: { fg: "red" }, selected: { bg: "green", fg: "black" } },
  items: getMainMenItems()
});

function getMainMenItems() {
  let items = [];
  if (Object.values(runningActions).some(count => count > 0)) {
    items.push("Stop Transaction");
  }
  items = items.concat([
    "Sepolia Network",
    "Sepolia R2 Network",
    "Claim Faucet",
    "Antrian Transaksi",
    "Clear Transaction Logs",
    "Refresh",
    "Exit"
  ]);
  return items;
}

function getSepoliaSubMenuItems() {
  let items = [];
  if (runningActions["Sepolia"] > 0) {
    items.push("Stop Transaction");
  }
  items = items.concat([
    "Auto Swap R2USD & USDC",
    "Auto Stake R2USD & sR2USD",
    "Auto Add LP R2USD & sR2USD",
    "Auto Add LP USDC & R2USD",
    "Manual Swap",
    "Change Random Amount",
    "Clear Transaction Logs",
    "Back To Main Menu",
    "Refresh"
  ]);
  return items;
}

function getSepoliaR2SubMenuItems() {
  let items = [];
  if (runningActions["Sepolia R2"] > 0) {
    items.push("Stop Transaction");
  }
  items = items.concat([
    "Auto Swap R2 & USDC",
    "Auto Swap R2 & R2USD",
    "Auto Add LP R2 & R2USD",
    "Auto Add LP USDC & R2",
    "Manual Swap",
    "Change Random Amount",
    "Clear Transaction Logs",
    "Back To Main Menu",
    "Refresh"
  ]);
  return items;
}

function getClaimFaucetSubMenuItems() {
  const items = [
    "Claim Faucet Sepolia",
    "Auto Daily Claim Faucet Sepolia",
    "Clear Transaction Logs",
    "Refresh",
    "Back to Main Menu"
  ];
  if (dailyClaimInterval) items.splice(1, 0, "Stop Auto Daily Claim");
  else if (claimRunning) items.splice(1, 0, "Stop Proses");
  return items;
}

const sepoliaSubMenu = blessed.list({
  label: " Sepolia Network Sub Menu ",
  left: "60%",
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  border: { type: "line" },
  style: { fg: "white", bg: "default", border: { fg: "red" }, selected: { bg: "cyan", fg: "black" } },
  items: getSepoliaSubMenuItems()
});
sepoliaSubMenu.hide();

const sepoliaR2SubMenu = blessed.list({
  label: " Sepolia R2 Network Sub Menu ",
  left: "60%",
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  border: { type: "line" },
  style: { fg: "white", bg: "default", border: { fg: "red" }, selected: { bg: "cyan", fg: "black" } },
  items: getSepoliaR2SubMenuItems()
});
sepoliaR2SubMenu.hide();

const claimFaucetSubMenu = blessed.list({
  label: " Claim Faucet ",
  left: "60%",
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  border: { type: "line" },
  style: { fg: "white", bg: "default", border: { fg: "red" }, selected: { bg: "cyan", fg: "black" } },
  items: getClaimFaucetSubMenuItems()
});
claimFaucetSubMenu.hide();

const sepoliaManualSwapSubMenu = blessed.list({
  label: " Manual Swap ",
  left: "60%",
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  border: { type: "line" },
  style: { fg: "white", bg: "default", border: { fg: "red" }, selected: { bg: "cyan", fg: "black" } }
});
sepoliaManualSwapSubMenu.hide();

const sepoliaChangeRandomAmountSubMenu = blessed.list({
  label: " Change Random Amount ",
  left: "60%",
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  border: { type: "line" },
  style: { fg: "white", bg: "default", border: { fg: "red" }, selected: { bg: "cyan", fg: "black" } },
  items: ["SWAP_R2USD_USDC", "SWAP_R2_USDC", "SWAP_R2_R2USD", "Back To Sepolia Network Menu"]
});
sepoliaChangeRandomAmountSubMenu.hide();

const promptBox = blessed.prompt({
  parent: screen,
  border: "line",
  height: 5,
  width: "60%",
  top: "center",
  left: "center",
  label: "{bright-blue-fg}Prompt{/bright-blue-fg}",
  tags: true,
  keys: true,
  vi: true,
  mouse: true,
  style: { fg: "bright-red", bg: "default", border: { fg: "red" } }
});

screen.append(headerBox);
screen.append(descriptionBox);
screen.append(logsBox);
screen.append(welcomeBox);
screen.append(walletBox);
screen.append(mainMenu);
screen.append(sepoliaSubMenu);
screen.append(sepoliaR2SubMenu);
screen.append(claimFaucetSubMenu);
screen.append(sepoliaManualSwapSubMenu);
screen.append(sepoliaChangeRandomAmountSubMenu);

function updateWelcomeBox() {
  const botVersion = "FINAL TESTNET V1.0.0";
  const content = `{center}{bold}{bright-red-fg}[:: R2 :: AUTO :: BOT ::]{/bright-red-fg}{/bold}{/center}\n\n` +
    `{center}{bold}{bright-yellow-fg}Version : ${botVersion}{/bright-yellow-fg}{/bold}{/center}\n` +
    `{center}{bold}{bright-cyan-fg}➥ Join Telegram : t.me/YetiDAO{/bright-cyan-fg}{/bold}{/center}\n` +
    `{center}{bold}{bright-cyan-fg}➥ Subscribe : Youtube.com/@YetiDAO{/bright-cyan-fg}{/bold}{/center}\n` +
    `{center}{bold}{grey-fg}➥ Join Telegram : t.me/cryptodai3{/grey-fg}{/bold}{/center}\n`;
  welcomeBox.setContent(content);
  safeRender();
}

function adjustLayout() {
  const screenHeight = screen.height;
  const screenWidth = screen.width;
  const headerHeight = Math.max(8, Math.floor(screenHeight * 0.15));
  headerBox.top = 0;
  headerBox.height = headerHeight;
  headerBox.width = "100%";
  descriptionBox.top = "23%";
  descriptionBox.height = Math.floor(screenHeight * 0.05);
  logsBox.top = headerHeight + descriptionBox.height;
  logsBox.left = 0;
  logsBox.width = Math.floor(screenWidth * 0.6);
  logsBox.height = screenHeight - (headerHeight + descriptionBox.height);
  welcomeBox.top = headerHeight + descriptionBox.height;
  welcomeBox.left = Math.floor(screenWidth * 0.6);
  welcomeBox.width = Math.floor(screenWidth * 0.4);
  welcomeBox.height = Math.floor(screenHeight * 0.35);
  walletBox.top = headerHeight + descriptionBox.height;
  walletBox.left = Math.floor(screenWidth * 0.6);
  walletBox.width = Math.floor(screenWidth * 0.4);
  walletBox.height = Math.floor(screenHeight * 0.35);
  mainMenu.top = headerHeight + descriptionBox.height + welcomeBox.height;
  mainMenu.left = Math.floor(screenWidth * 0.6);
  mainMenu.width = Math.floor(screenWidth * 0.4);
  mainMenu.height = screenHeight - (headerHeight + descriptionBox.height + welcomeBox.height);
  sepoliaSubMenu.top = mainMenu.top;
  sepoliaSubMenu.left = mainMenu.left;
  sepoliaSubMenu.width = mainMenu.width;
  sepoliaSubMenu.height = mainMenu.height;
  sepoliaR2SubMenu.top = mainMenu.top;
  sepoliaR2SubMenu.left = mainMenu.left;
  sepoliaR2SubMenu.width = mainMenu.width;
  sepoliaR2SubMenu.height = mainMenu.height;
  claimFaucetSubMenu.top = mainMenu.top;
  claimFaucetSubMenu.left = mainMenu.left;
  claimFaucetSubMenu.width = mainMenu.width;
  claimFaucetSubMenu.height = mainMenu.height;
  sepoliaManualSwapSubMenu.top = mainMenu.top;
  sepoliaManualSwapSubMenu.left = mainMenu.left;
  sepoliaManualSwapSubMenu.width = mainMenu.width;
  sepoliaManualSwapSubMenu.height = mainMenu.height;
  sepoliaChangeRandomAmountSubMenu.top = mainMenu.top;
  sepoliaChangeRandomAmountSubMenu.left = mainMenu.left;
  sepoliaChangeRandomAmountSubMenu.width = mainMenu.width;
  sepoliaChangeRandomAmountSubMenu.height = mainMenu.height;
}

adjustLayout();

mainMenu.on("select", (item) => {
  const selected = item.getText();
  if (selected === "Stop Transaction") {
    Object.keys(swapCancelled).forEach(net => swapCancelled[net] = true);
    addLog("Stop Transaction: Semua transaksi akan dihentikan.", "system");
  } else if (selected === "Sepolia Network") {
    currentNetwork = "Sepolia";
    welcomeBox.hide();
    walletBox.show();
    updateWalletData("Sepolia");
    sepoliaSubMenu.show();
    sepoliaSubMenu.focus();
    safeRender();
  } else if (selected === "Sepolia R2 Network") {
    currentNetwork = "Sepolia R2";
    welcomeBox.hide();
    walletBox.show();
    updateWalletData("Sepolia R2");
    sepoliaR2SubMenu.show();
    sepoliaR2SubMenu.focus();
    safeRender();
  } else if (selected === "Claim Faucet") {
    mainMenu.hide();
    claimFaucetSubMenu.show();
    claimFaucetSubMenu.focus();
    safeRender();
  } else if (selected === "Antrian Transaksi") {
    showTransactionQueueMenu();
  } else if (selected === "Clear Transaction Logs") {
    clearTransactionLogs();
  } else if (selected === "Refresh") {
    updateWelcomeBox();
    updateWalletData(currentNetwork);
    safeRender();
    addLog("Refreshed", "system", currentNetwork);
  } else if (selected === "Exit") {
    process.exit(0);
  }
});

sepoliaSubMenu.on("select", (item) => {
  const selected = item.getText();
  if (selected === "Stop Transaction") {
    swapCancelled["Sepolia"] = true;
    addLog("Perintah Stop Transaction diterima untuk Sepolia.", "swap", "Sepolia");
  } else if (selected === "Auto Swap R2USD & USDC") {
    runAutoAction(autoSwapR2usdUsdc, "Auto Swap R2USD & USDC", "Sepolia");
  } else if (selected === "Auto Stake R2USD & sR2USD") {
    runAutoAction(autoStakeR2usdSr2usd, "Auto Stake R2USD & sR2USD", "Sepolia");
  } else if (selected === "Auto Add LP R2USD & sR2USD") {
    runAutoAction(autoAddLpR2usdSr2usd, "Auto Add LP R2USD & sR2USD", "Sepolia");
  } else if (selected === "Auto Add LP USDC & R2USD") {
    runAutoAction(autoAddLpUsdcR2usd, "Auto Add LP USDC & R2USD", "Sepolia");
  } else if (selected === "Manual Swap") {
    sepoliaSubMenu.hide();
    sepoliaManualSwapSubMenu.setItems(["USDC -> R2USD", "R2USD -> USDC", "Back To Sepolia Network Menu"]);
    sepoliaManualSwapSubMenu.show();
    sepoliaManualSwapSubMenu.focus();
    safeRender();
  } else if (selected === "Change Random Amount") {
    sepoliaSubMenu.hide();
    sepoliaChangeRandomAmountSubMenu.show();
    sepoliaChangeRandomAmountSubMenu.focus();
    safeRender();
  } else if (selected === "Clear Transaction Logs") {
    clearTransactionLogs();
  } else if (selected === "Back To Main Menu") {
    sepoliaSubMenu.hide();
    walletBox.hide();
    welcomeBox.show();
    mainMenu.show();
    mainMenu.focus();
    updateWelcomeBox();
    safeRender();
  } else if (selected === "Refresh") {
    updateWalletData("Sepolia");
    safeRender();
    addLog("Refreshed", "system", currentNetwork);
  }
});

sepoliaR2SubMenu.on("select", (item) => {
  const selected = item.getText();
  if (selected === "Stop Transaction") {
    swapCancelled["Sepolia R2"] = true;
    addLog("Perintah Stop Transaction diterima untuk Sepolia R2.", "swap", "Sepolia R2");
  } else if (selected === "Auto Swap R2 & USDC") {
    runAutoAction(autoSwapR2Usdc, "Auto Swap R2 & USDC", "Sepolia R2");
  } else if (selected === "Auto Swap R2 & R2USD") {
    runAutoAction(autoSwapR2R2usd, "Auto Swap R2 & R2USD", "Sepolia R2");
  } else if (selected === "Auto Add LP R2 & R2USD") {
    runAutoAction(addLpR2R2usd, "Auto Add LP R2 & R2USD", "Sepolia R2");
  } else if (selected === "Auto Add LP USDC & R2") {
    runAutoAction(addLpR2Usdc, "Auto Add LP USDC & R2", "Sepolia R2");
  } else if (selected === "Manual Swap") {
    sepoliaR2SubMenu.hide();
    sepoliaManualSwapSubMenu.setItems(["USDC -> R2", "R2 -> USDC", "R2 -> R2USD", "R2USD -> R2", "Back To Sepolia R2 Network Menu"]);
    sepoliaManualSwapSubMenu.show();
    sepoliaManualSwapSubMenu.focus();
    safeRender();
  } else if (selected === "Change Random Amount") {
    sepoliaR2SubMenu.hide();
    sepoliaChangeRandomAmountSubMenu.show();
    sepoliaChangeRandomAmountSubMenu.focus();
    safeRender();
  } else if (selected === "Clear Transaction Logs") {
    clearTransactionLogs();
  } else if (selected === "Back To Main Menu") {
    sepoliaR2SubMenu.hide();
    walletBox.hide();
    welcomeBox.show();
    mainMenu.show();
    mainMenu.focus();
    updateWelcomeBox();
    safeRender();
  } else if (selected === "Refresh") {
    updateWalletData("Sepolia R2");
    safeRender();
    addLog("Refreshed", "system", currentNetwork);
  }
});

claimFaucetSubMenu.on("select", (item) => {
  const selected = item.getText();
  if (selected === "Claim Faucet Sepolia") {
    addLog("Memulai Claim Faucet untuk Sepolia.", "system");
    claimFaucet("Sepolia");
  } else if (selected === "Auto Daily Claim Faucet Sepolia") {
    if (claimRunning) {
      addLog("Proses claim faucet sedang berjalan.", "warning");
    } else {
      startAutoDailyClaim();
    }
  } else if (selected === "Stop Auto Daily Claim") {
    stopAutoDailyClaim();
  } else if (selected === "Stop Proses") {
    if (claimRunning) {
      claimCancelled = true;
      addLog("Perintah Stop Proses diterima.", "system");
      claimFaucetSubMenu.setItems(getClaimFaucetSubMenuItems());
      safeRender();
    }
  } else if (selected === "Clear Transaction Logs") {
    clearTransactionLogs();
  } else if (selected === "Back to Main Menu") {
    claimFaucetSubMenu.hide();
    mainMenu.show();
    mainMenu.focus();
    safeRender();
  } else if (selected === "Refresh") {
    addLog("Refreshed", "system");
    claimFaucetSubMenu.setItems(getClaimFaucetSubMenuItems());
    safeRender();
  }
});

sepoliaManualSwapSubMenu.on("select", (item) => {
  const selected = item.getText();
  if (selected === "USDC -> R2USD" || selected === "R2USD -> USDC" || selected === "USDC -> R2" || selected === "R2 -> USDC" || selected === "R2 -> R2USD" || selected === "R2USD -> R2") {
    promptBox.setFront();
    const [fromToken, toToken] = selected.split(" -> ");
    promptBox.input(`Masukkan jumlah ${fromToken} yang ingin di-swap ke ${toToken}`, "", async (err, value) => {
      promptBox.hide();
      safeRender();
      if (err || !value) {
        addLog("Manual Swap: Input tidak valid atau dibatalkan.", "swap", currentNetwork);
        return;
      }
      const amount = parseFloat(value);
      if (isNaN(amount) || amount <= 0) {
        addLog("Manual Swap: Jumlah harus lebih besar dari 0.", "swap", currentNetwork);
        return;
      }
      addLog(`Manual Swap: Memulai swap ${amount} ${selected}.`, "swap", currentNetwork);
      try {
        await addTransactionToQueue(
          currentNetwork === "Sepolia" ?
            (selected === "USDC -> R2USD" ?
              (nonce, wallet, provider, config) => swapUsdcToR2usd(amount, nonce, wallet, provider, config) :
              (nonce, wallet, provider, config) => swapR2usdToUsdc(amount, nonce, wallet, provider, config)) :
            (selected === "USDC -> R2" ?
              (nonce, wallet, provider, config) => swapUsdcToR2(amount, nonce, wallet, provider, config) :
              selected === "R2 -> USDC" ?
                (nonce, wallet, provider, config) => swapR2ToUsdc(amount, nonce, wallet, provider, config) :
                selected === "R2 -> R2USD" ?
                  (nonce, wallet, provider, config) => swapR2ToR2usd(amount, nonce, wallet, provider, config) :
                  (nonce, wallet, provider, config) => swapR2usdToR2(amount, nonce, wallet, provider, config)),
          `Manual Swap ${amount} ${selected}`,
          currentNetwork
        );
        await updateWalletData(currentNetwork);
        addLog(`Manual Swap: Swap ${amount} ${selected} selesai.`, "success", currentNetwork);
      } catch (error) {
        addLog(`Manual Swap: Gagal - ${error.message}`, "error", currentNetwork);
      }
    });
  } else if (selected === "Back To Sepolia Network Menu") {
    sepoliaManualSwapSubMenu.hide();
    sepoliaSubMenu.show();
    sepoliaSubMenu.focus();
    safeRender();
  } else if (selected === "Back To Sepolia R2 Network Menu") {
    sepoliaManualSwapSubMenu.hide();
    sepoliaR2SubMenu.show();
    sepoliaR2SubMenu.focus();
    safeRender();
  }
});

sepoliaChangeRandomAmountSubMenu.on("select", (item) => {
  const selected = item.getText();
  if (selected === "SWAP_R2USD_USDC" || selected === "SWAP_R2_USDC" || selected === "SWAP_R2_R2USD") {
    const tokens = selected === "SWAP_R2USD_USDC" ? ["USDC", "R2USD"] : selected === "SWAP_R2_USDC" ? ["USDC", "R2"] : ["R2", "R2USD"];
    let index = 0;
    function promptForToken() {
      if (index >= tokens.length) {
        addLog("Change Random Amount: Rentang diubah.", "success", currentNetwork);
        sepoliaChangeRandomAmountSubMenu.show();
        sepoliaChangeRandomAmountSubMenu.focus();
        safeRender();
        return;
      }
      const token = tokens[index];
      promptBox.setFront();
      promptBox.input(`Masukkan rentang untuk ${token} (format: min,max, contoh: 50,200)`, "", (err, value) => {
        promptBox.hide();
        safeRender();
        if (err || !value) {
          addLog(`Change Random Amount: Input untuk ${token} dibatalkan.`, "system", currentNetwork);
          return;
        }
        const [min, max] = value.split(",").map(v => parseFloat(v.trim()));
        if (isNaN(min) || isNaN(max) || min <= 0 || max <= min) {
          addLog(`Change Random Amount: Input tidak valid untuk ${token}.`, "error", currentNetwork);
          return;
        }
        randomAmountRanges[selected][token].min = min;
        randomAmountRanges[selected][token].max = max;
        index++;
        promptForToken();
      });
    }
    promptForToken();
  } else if (selected === "Back To Sepolia Network Menu") {
    sepoliaChangeRandomAmountSubMenu.hide();
    if (currentNetwork === "Sepolia") {
      sepoliaSubMenu.show();
      sepoliaSubMenu.focus();
    } else {
      sepoliaR2SubMenu.show();
      sepoliaR2SubMenu.focus();
    }
    safeRender();
  }
});

screen.key(["escape", "q", "C-c"], () => process.exit(0));
screen.key(["C-up"], () => { logsBox.scroll(-1); safeRender(); });
screen.key(["C-down"], () => { logsBox.scroll(1); safeRender(); });

safeRender();
mainMenu.focus();
addLog("Dont Forget To Subscribe YT And Telegram @Yetidao!!", "system");
updateWelcomeBox();

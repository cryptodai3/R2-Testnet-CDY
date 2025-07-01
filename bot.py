import json, time
from web3 import Web3
from decimal import Decimal
from eth_abi import encode
from rich.console import Console
from rich.panel import Panel
from time import sleep
from rich.live import Live
from rich.text import Text

console = Console()


console.print(Panel.fit(
    "[bold cyan]Auto Swap, Transfer, LP & Stake\n[green]By YETIDAO [/green]\n[link=https://t.me/yetidao]Join Telegram[/link]",
    title="R2 Testnet Tool", subtitle="Full Flow Automation"
))
console.print("-" * 50)

RPC = "https://ethereum-sepolia-rpc.publicnode.com"
CHAIN_ID = 11155111
web3 = Web3(Web3.HTTPProvider(RPC))
chain_id = web3.eth.chain_id
ROUTER_MATRIX = Web3.to_checksum_address("0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2")
ROUTER = Web3.to_checksum_address("0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3")
R2USD = web3.to_checksum_address("0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365")
sR2USD = web3.to_checksum_address("0x006CbF409CA275bA022111dB32BDAE054a97d488")
WBTC = web3.to_checksum_address("0x4f5b54d4AF2568cefafA73bB062e5d734b55AA05")
STAKING_CONTRACT = web3.to_checksum_address("0x23b2615d783E16F14B62EfA125306c7c69B4941A")

TOKENS = {
    "R2": Web3.to_checksum_address("0xb816bB88f836EA75Ca4071B46FF285f690C43bb7"),
    "USDC": Web3.to_checksum_address("0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2"),
    "R2USD": Web3.to_checksum_address("0x9e8ff356d35a2da385c546d6bf1d77ff85133365"),
    "sR2USD": Web3.to_checksum_address("0x006cbf409ca275ba022111db32bdae054a97d488"),
    "WBTC":web3.to_checksum_address("0x4f5b54d4AF2568cefafA73bB062e5d734b55AA05"),
}

ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
]

try:
    with open("token_abi.json") as f:
        erc20_abi = json.load(f)
    with open("router_swap_abi.json") as f:
        router_swap_abi = json.load(f)
except Exception as e:
    console.print(f"[red]❌ Failed to load ABI JSON file: {str(e)}[/red]")
    exit()

try:
    with open("network_config.json") as f:
        config = json.load(f)
except Exception as e:
    console.print(f"[red]❌ Failed to load config: {str(e)}[/red]")
    exit()

web3 = Web3(Web3.HTTPProvider(config["rpc"]))
if not web3.is_connected():
    console.print("[red]❌ Failed to connect to RPC[/red]")
    exit()
console.print("[green]✅ Connected to RPC[/green]")

CHAIN_ID = config["chain_id"]
TOKEN_MAPPING = {k: Web3.to_checksum_address(v["address"]) for k, v in config["tokens"].items()}

def get_nonce(addr): return web3.eth.get_transaction_count(addr, "pending")
def get_gas_price(): return int(web3.eth.gas_price * Decimal(1.2))
def get_gas(): return web3.eth.gas_price + Web3.to_wei(2, 'gwei')
def short(addr): return f"{addr[:6]}...{addr[-4:]}"
def get_erc20(address): return web3.eth.contract(address=address, abi=erc20_abi)


def warning_membership():
    with Live(refresh_per_second=2) as live:
        for i in range(20):  
            if i % 2 == 0:
                panel = Panel.fit(
                    "[bold red]🔺❗ JOIN MEMBERSHIP for more bots! ❗🔺\n\n"
                    "[bold yellow]👉 https://t.me/yetidao 👈[/bold yellow]",
                    title="[bold red]⚠️ WARNING ⚠️[/bold red]",
                    border_style="red",
                    padding=(1, 4),
                    style="bold white"
                )
                live.update(panel)
            else:
                live.update(Text(" "))
            sleep(0.5)


def swap_token(amount, path, sender, privkey, router_addr, label):
    try:
        with open("router_swap_abi.json") as f: abi = json.load(f)
        contract = web3.eth.contract(address=router_addr, abi=abi)
        tx = contract.functions.swapExactTokensForTokens(
            amount, 
            0, 
            [Web3.to_checksum_address(p) for p in path], 
            sender, 
            int(time.time()) + 600
        ).build_transaction({
            "chainId": CHAIN_ID, 
            "from": sender, 
            "gasPrice": get_gas(),
            "nonce": get_nonce(sender), 
            "gas": 300000
        })
        signed = web3.eth.account.sign_transaction(tx, privkey)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        if receipt.status == 1:
            show_status(f"Swap {label}", sender, router_addr, "[green]Success[/green]", web3.to_hex(tx_hash))
            return True
        show_status(f"Swap {label}", sender, router_addr, "[red]Failed[/red]")
        return False
    except Exception as e:
        show_status(f"Swap {label}", sender, router_addr, f"[red]Error: {str(e)}[/red]")
        return False

def show_status(action, sender, contract, status, tx_hash=None):
    console.print(f"[bold]📍 Action     {action}[/bold]")
    console.print(f"💳 Address    {short(sender)}")
    console.print(f"🔁 Contract   {short(contract)}")
    
    if "Success" in status:
        console.print("[green]✅ Status     Success[/green]")
    elif "Already Approved" in status:
        console.print("[cyan]✅ Status     Already Approved[/cyan]")
    elif "❌" in status or "Error" in status:
        console.print("[red]❌ Status     Failed[/red]")
    else:
        console.print(f"{status}")  

    if tx_hash:
        console.print(f"🔗 TX Hash    https://sepolia.etherscan.io/tx/{tx_hash}")
    console.print("──────────────────────────────────────────────────")



def transfer_token(sender, to, token, amount, privkey, label):
    try:
        func = web3.keccak(text="transfer(address,uint256)")[:4]
        to_bytes = bytes.fromhex(to[2:].rjust(64, '0'))
        amt_bytes = int(amount).to_bytes(32, 'big')
        data = func + to_bytes + amt_bytes
        tx = {
            'chainId': CHAIN_ID,
            'from': sender,
            'to': token,
            'data': web3.to_hex(data),
            'gasPrice': get_gas(),
            'gas': 100000,
            'nonce': get_nonce(sender)
        }
        signed = web3.eth.account.sign_transaction(tx, privkey)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        status = "✅" if receipt.status == 1 else "❌"
        console.print(f"{status} Transfer {label} - {short(sender)} → {short(to)} | TX: https://sepolia.etherscan.io/tx/{web3.to_hex(tx_hash)}")
        return receipt.status == 1
    except Exception as e:
        console.print(f"[red]❌ Transfer {label} Error - {e}[/red]")
        return False
        
def approve_token_swap(sender, spender, amount, privkey, token_addr, label):
    try:
        contract = get_erc20(token_addr)
        allowance = contract.functions.allowance(sender, spender).call()
        if allowance >= amount:
            show_status(f"Approve {label}", sender, token_addr, "[green]Already Approved[/green]")
            return True

        tx = contract.functions.approve(spender, amount).build_transaction({
            "from": sender,
            "nonce": get_nonce(sender),
            "gasPrice": get_gas(),
            "chainId": CHAIN_ID,
            "gas": 60000
        })
        signed = web3.eth.account.sign_transaction(tx, privkey)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        while True:
            try:
                receipt = web3.eth.get_transaction_receipt(tx_hash)
                if receipt and receipt["status"] == 1:
                    break
            except:
                pass
            time.sleep(5)

        show_status(f"Approve {label}", sender, token_addr, "[green]Success[/green]", web3.to_hex(tx_hash))
        return True

    except Exception as e:
        show_status(f"Approve {label}", sender, token_addr, f"[red]{str(e)}[/red]")
        return False
        
def approve_token_lp(token, spender, amount, sender, privkey):
    contract = web3.eth.contract(address=token, abi=ERC20_ABI)
    allowance = contract.functions.allowance(sender, spender).call()
    if allowance >= amount:
        console.print(f"[green]✅ Allowance sufficient untuk {token[-4:]}[/green]")
        return
    tx = contract.functions.approve(spender, amount).build_transaction({
        "chainId": CHAIN_ID,
        "from": sender,
        "nonce": get_nonce(sender),
        "gasPrice": get_gas_price(),
        "gas": 60000
    })
    signed = web3.eth.account.sign_transaction(tx, privkey)
    tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
    console.print(f"[yellow]⏳ Approving {token[-4:]}...[/yellow]")
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt.status == 1:
        console.print(f"[green]✅ Approve successful: {tx_hash.hex()}[/green]")
    else:
        console.print(f"[red]❌ Approve failed: {tx_hash.hex()}[/red]")

def approve_token_stake(token_addr, owner, spender, amount, key):
    contract = web3.eth.contract(address=token_addr, abi=ERC20_ABI)
    tx = contract.functions.approve(spender, amount).build_transaction({
        'chainId': chain_id,
        'from': owner,
        'nonce': get_nonce(owner),
        'gas': 60000,
        'gasPrice': get_gas_price()
    })
    signed = web3.eth.account.sign_transaction(tx, key)
    tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
    web3.eth.wait_for_transaction_receipt(tx_hash)
    console.print(f"[green]✅ Approve {token_addr[-4:]} successful[/green]")
    
def add_liquidity(tokenA, tokenB, amountA, amountB, sender, privkey):
    try:
        func_selector = "e8e33700"
        encoded = encode(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'address', 'uint256'],
            [tokenA, tokenB, amountA, amountB, 0, 0, sender, int(time.time()) + 1000]
        )
        data = web3.to_bytes(hexstr=func_selector) + encoded

        tx = {
            "chainId": CHAIN_ID,
            "from": sender,
            "to": ROUTER,
            "nonce": get_nonce(sender),
            "gasPrice": get_gas_price(),
            "gas": 400000,
            "data": data
        }

        signed = web3.eth.account.sign_transaction(tx, privkey)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_hash

        status = "[green]Success[/green]" if receipt.status == 1 else "[red]Failed[/red]"
        show_status("Add LP", sender, ROUTER, status, tx_hash.hex())

    except Exception as e:
        show_status("Add LP", sender, ROUTER, f"[red]{str(e)}[/red]")
        

def add_liquidity_matrix(token0, token1, amount0, amount1, sender, privkey, pair_name=""):
    try:
        func_selector = "a7256d09"
        encoded = encode(
            ['uint256[]', 'uint256', 'address'],
            [[amount0, amount1], 0, sender]
        )
        data = web3.to_bytes(hexstr=func_selector) + encoded

        tx = {
            "chainId": CHAIN_ID,
            "from": sender,
            "to": ROUTER_MATRIX,
            "nonce": get_nonce(sender),
            "gasPrice": get_gas_price(),
            "gas": 300000,
            "data": data
        }

        signed = web3.eth.account.sign_transaction(tx, privkey)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_hash


        status = f"[green]Success[/green]" if receipt.status == 1 else "[red]Failed[/red]"
        show_status(f"Add LP {pair_name}", sender, ROUTER_MATRIX, status, tx_hash.hex())

    except Exception as e:
        show_status(f"Add LP {pair_name}", sender, ROUTER_MATRIX, f"[red]{str(e)}[/red]")

def stake_r2usd_to_sr2usd(sender, privkey):
    amount = 1 * 10**6  
    token = web3.eth.contract(address=R2USD, abi=ERC20_ABI)
    contract = web3.eth.contract(address=sR2USD, abi=ERC20_ABI)

    balance = token.functions.balanceOf(sender).call()
    if balance < amount:
        console.print(f"[yellow]⚠️ R2USD too low ({balance / 1e6})[/yellow]")
        return

    allowance = token.functions.allowance(sender, sR2USD).call()
    if allowance < amount:
        approve_token(R2USD, sender, sR2USD, amount, privkey)
        time.sleep(2)

    try:
        data = bytes.fromhex("1a5f0f00") + encode(["uint256"] * 10, [amount] + [0]*9)
        tx = {
            'chainId': chain_id,
            'from': sender,
            'to': sR2USD,
            'nonce': get_nonce(sender),
            'gasPrice': get_gas_price(),
            'gas': web3.eth.estimate_gas({'from': sender, 'to': sR2USD, 'data': data}),
            'data': data
        }
        signed = web3.eth.account.sign_transaction(tx, privkey)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_hash


        status = "[green]Success[/green]" if receipt.status == 1 else "[red]Failed[/red]"
        show_status("Stake R2USD → sR2USD", sender, sR2USD, status, tx_hash.hex())

    except Exception as e:
        show_status("Stake R2USD → sR2USD", sender, sR2USD, f"[red]{str(e)}[/red]")

        
def stake_wbtc(sender, privkey):
    amount = int(0.01 * 10**8)  
    token = web3.eth.contract(address=WBTC, abi=ERC20_ABI)

    balance = token.functions.balanceOf(sender).call()
    if balance < amount:
        console.print(f"[yellow]⚠️ WBTC balance too low ({balance / 1e8})[/yellow]")
        return None 

    allowance = token.functions.allowance(sender, STAKING_CONTRACT).call()
    if allowance < amount:
        approve_token(WBTC, sender, STAKING_CONTRACT, amount, privkey)
        time.sleep(2)

    try:
        data = bytes.fromhex("1a5f0f00") + encode(["uint256"] * 10, [amount] + [0]*9)
        tx = {
            'chainId': CHAIN_ID,
            'from': sender,
            'to': STAKING_CONTRACT,
            'nonce': get_nonce(sender),
            'gasPrice': get_gas_price(),
            'gas': web3.eth.estimate_gas({'from': sender, 'to': STAKING_CONTRACT, 'data': data}),
            'data': data
        }

        signed = web3.eth.account.sign_transaction(tx, privkey)
        tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

        status = "[green]Success[/green]" if receipt.status == 1 else "[red]Failed[/red]"
        show_status("Stake WBTC", sender, STAKING_CONTRACT, status, web3.to_hex(tx_hash))
        return tx_hash if receipt.status == 1 else None

    except Exception as e:
        show_status("Stake WBTC", sender, STAKING_CONTRACT, f"[red]{str(e)}[/red]")
        return None



def main():
    try:
        with open("accounts.txt") as f:
            wallets = [x.strip() for x in f if x.strip()]
    except FileNotFoundError:
        console.print("[red]❌ File accounts.txt not found![/red]")
        return

    for i, pk in enumerate(wallets, 1):
        warning_membership()
        try:
            acc = web3.eth.account.from_key(pk)
            sender = acc.address
            console.print(f"\n[bold cyan]▶ Wallet {i}: {short(sender)}[/bold cyan]")
            console.print("──────────────────────────────────────────────")

            router = Web3.to_checksum_address(config["swap_routers"]["r2_to_usdc"])
            token_r2 = TOKEN_MAPPING["R2"]
            token_usdc = TOKEN_MAPPING["USDC"]
            amount_swap = int(Decimal(config["swap_amounts"]["r2_to_usdc"]) * 10**config["tokens"]["R2"]["decimals"])
            approve_token_swap(sender, router, amount_swap, pk, token_r2, "R2")

            with open("router_swap_abi.json") as f:
                router_abi = json.load(f)

            contract = web3.eth.contract(address=router, abi=router_abi)
            tx = contract.functions.swapExactTokensForTokens(
                amount_swap, 0, [token_r2, token_usdc], sender, int(time.time()) + 600
            ).build_transaction({
                'chainId': CHAIN_ID,
                'from': sender,
                'gasPrice': get_gas(),
                'nonce': get_nonce(sender),
                'gas': 300000
            })
            signed = web3.eth.account.sign_transaction(tx, pk)
            tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
            status = "[green]Success[/green]" if receipt.status == 1 else "❌"
            show_status("Swap R2 → USDC", sender, router, status, web3.to_hex(tx_hash))
            time.sleep(10)

            router_r2_r2usd = Web3.to_checksum_address(config["swap_routers"]["usdc_to_r2usd"])
            token_r2usd = TOKEN_MAPPING["R2USD"]
            amount_swap_r2_r2usd = amount_swap
            approve_token_swap(sender, router_r2_r2usd, amount_swap_r2_r2usd, pk, token_r2, "R2")

            contract_r2_r2usd = web3.eth.contract(address=router_r2_r2usd, abi=router_abi)
            tx = contract_r2_r2usd.functions.swapExactTokensForTokens(
                amount_swap_r2_r2usd, 0, [token_r2, token_r2usd], sender, int(time.time()) + 600
            ).build_transaction({
                'chainId': CHAIN_ID,
                'from': sender,
                'gasPrice': get_gas(),
                'nonce': get_nonce(sender),
                'gas': 300000
            })
            signed_tx = web3.eth.account.sign_transaction(tx, pk)
            tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
            status = "[green]Success[/green]" if receipt.status == 1 else "❌"
            show_status("Swap R2 → R2USD", sender, router_r2_r2usd, status, web3.to_hex(tx_hash))
            time.sleep(10)

            amount_usdc = int(Decimal(config["swap_amounts"]["usdc_to_r2usd"]) * 10**config["tokens"]["USDC"]["decimals"])
            approve_token_swap(sender, token_r2usd, amount_usdc, pk, token_usdc, "USDC")

            func_selector = bytes.fromhex("095e7a95")
            encoded_args = encode(
                ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
                [sender, amount_usdc, 0, 0, 0, 0, 0]
            )
            data = func_selector + encoded_args
            tx = {
                'chainId': CHAIN_ID,
                'from': sender,
                'to': token_r2usd,
                'data': web3.to_hex(data),
                'gasPrice': get_gas(),
                'nonce': get_nonce(sender),
                'gas': 300000
            }
            signed_tx = web3.eth.account.sign_transaction(tx, pk)
            tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
            status = "[green]Success[/green]" if receipt.status == 1 else "❌"
            show_status("Buy USDC → R2USD", sender, token_r2usd, status, web3.to_hex(tx_hash))
            time.sleep(10)

            r2_amount = 999238050579962498
            usdc_amount = 234298
            approve_token_lp(TOKENS["R2"], ROUTER, r2_amount, sender, pk)
            time.sleep(1)
            approve_token_lp(TOKENS["USDC"], ROUTER, usdc_amount, sender, pk)
            time.sleep(1)
            tx_hash = add_liquidity(TOKENS["R2"], TOKENS["USDC"], r2_amount, usdc_amount, sender, pk)
            show_status("Add LP: R2 + USDC", sender, ROUTER, "[green]Success[/green]", web3.to_hex(tx_hash))
            time.sleep(3)

            r2_amount2 = 1000000000000000000
            r2usd_amount = 233862
            approve_token_lp(TOKENS["R2"], ROUTER, r2_amount2, sender, pk)
            time.sleep(1)
            approve_token_lp(TOKENS["R2USD"], ROUTER, r2usd_amount, sender, pk)
            time.sleep(1)
            tx_hash = add_liquidity(TOKENS["R2"], TOKENS["R2USD"], r2_amount2, r2usd_amount, sender, pk)
            show_status("Add LP: R2 + R2USD", sender, ROUTER, "[green]Success[/green]", web3.to_hex(tx_hash))
            time.sleep(3)

            r2usd_amount2 = 1000000
            usdc_amount2 = 1020976
            approve_token_lp(TOKENS["R2USD"], ROUTER_MATRIX, r2usd_amount2, sender, pk)
            time.sleep(1)
            approve_token_lp(TOKENS["USDC"], ROUTER_MATRIX, usdc_amount2, sender, pk)
            time.sleep(1)
            tx_hash = add_liquidity_matrix(
                TOKENS["R2USD"], TOKENS["USDC"],
                r2usd_amount2, usdc_amount2,
                sender, pk,
                pair_name="R2USD + USDC"
            )
            show_status("Add LP: R2USD + USDC", sender, ROUTER_MATRIX, "[green]Success[/green]", web3.to_hex(tx_hash))
            time.sleep(3)

            sr2usd_amount2 = 1000000
            r2usd_amount3 = 995937
            approve_token_lp(TOKENS["sR2USD"], ROUTER_MATRIX, sr2usd_amount2, sender, pk)
            time.sleep(1)
            approve_token_lp(TOKENS["R2USD"], ROUTER_MATRIX, r2usd_amount3, sender, pk)
            time.sleep(1)
            tx_hash = add_liquidity_matrix(
                TOKENS["sR2USD"], TOKENS["R2USD"],
                sr2usd_amount2, r2usd_amount3,
                sender, pk,
                pair_name="sR2USD + R2USD"
            )
            show_status("Add LP: sR2USD + R2USD", sender, ROUTER_MATRIX, "[green]Success[/green]", web3.to_hex(tx_hash))
            time.sleep(3)

            approve_token_stake(TOKENS["R2USD"], sender, STAKING_CONTRACT, 999999999, pk)
            tx_hash = stake_r2usd_to_sr2usd(sender, pk)
            show_status("Stake R2USD", sender, STAKING_CONTRACT, "[green]Success[/green]", web3.to_hex(tx_hash))
            time.sleep(5)

            approve_token_stake(TOKENS["WBTC"], sender, STAKING_CONTRACT, 999999999, pk)
            tx_hash = stake_wbtc(sender, pk)
            show_status("Stake WBTC", sender, STAKING_CONTRACT, "[green]Success[/green]", web3.to_hex(tx_hash))
            time.sleep(5)

        except Exception as e:
            console.print(f"[red]❌ Wallet {i} Error: {str(e)}[/red]")
            console.print("──────────────────────────────────────────────")


if __name__ == "__main__":
    while True:
        try:
            console.print("\n[bold yellow]⏳ R2 Testnet Full Auto  [/bold yellow]")
            main()
            console.print("[bold green]✅ All processes completed. Waiting 24 hours before restarting...[/bold green]")
            console.print("🕒 Next time: " + time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time() + 86400)))
            time.sleep(86400)
        except Exception as e:
            console.print(f"[red]❌ Error occurred during loop: {e}[/red]")
            console.print("[yellow]⏳ Retrying after 60 seconds...[/yellow]")
            time.sleep(60)

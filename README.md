# 🤖 R2 Testnet Bot - CDY

Welcome to **R2-Testnet-CDY**, a powerful automation bot crafted to assist users in participating in the **R2 Testnet program** with Discord integration. The bot interacts with blockchain tasks and Discord verification to help automate testnet rewards and activity submissions.

🔗 Official Project: [R2 Testnet](https://r2.money?code=6FJHM)  
🎥 Discord Token Help: [Watch this tutorial](https://youtube.com) 

---

## 🚀 Features

- ✅ Automates R2 testnet interactions
- 🤖 Includes Discord integration for seamless verification
- 🔐 Uses your private key & Discord token (securely loaded from `.env`)
- 🛠 Fast, clean, and easy setup
- 🔁 Ideal for daily task runners and testnet contributors

---

## 🧰 Requirements

Before starting, ensure the following are installed on your system:

- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- `npm` (comes with Node.js)
- Git
- A Discord account and token
- An Ethereum-compatible wallet with private key (used for testnet)

---

## 📦 Installation and Setup

Follow the step-by-step guide below to set up and run the bot:

### 1️⃣ Clone the Repository

Use Git to download the source code:

```bash
git clone https://github.com/cryptodai3/R2-Testnet-CDY
````
```bash
cd R2-Testnet-CDY
````

---

### 2️⃣ Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

---

### 3️⃣ Configure Environment Variables

You need to set your **Ethereum Private Key** and **Discord Token** for the bot to function. Create a `.env` file:

```bash
nano .env
```

Paste the following into it:

```env
PRIVATE_KEY=your_private_key_here
DISCORD_TOKEN=your_discord_token_here
```

🔒 **Note**: Never share your `.env` file or private key with anyone. Keep this file secure.

📹 **Need help getting your Discord Token?**
Watch this video: [How to Get Your Discord Token](https://youtube.com) 

---

### ▶️ Run the Bot

Once your `.env` file is configured, start the bot with:

```bash
npm start
```

You should now see logs confirming the bot is running and performing R2 testnet operations.

---

## 📁 Project Structure

```
R2-Testnet-CDY/
├── node_modules/       # Installed dependencies
├── .env                # Your private key & Discord token (not shared)
├── index.js            # Main bot script
├── package.json        # Project config & dependencies
└── README.md           # Documentation
```

---

## 🛠 Troubleshooting

| Problem                 | Solution                                              |
| ----------------------- | ----------------------------------------------------- |
| `Missing Discord token` | Check your `.env` file for correct token syntax       |
| `Invalid private key`   | Ensure your private key starts with `0x` and is valid |
| `Cannot start bot`      | Run `npm install` again to reinstall dependencies     |

---


## ✍️ Author & Credits

**Happy Farming!** 🚀🌾

*Brought to you by [CryptoDai3](https://t.me/cryptodai3) X [YetiDAO](https://t.me/YetiDAO)*

---

## 🔒 Safety & Support

### ⚠️ Important Disclaimer

* **Testnet Only** – This tool is designed for testnet environments only
* **No Liability** – Use at your own risk. Developers assume no responsibility
* **DYOR** – Always do your own research before using any automation tools

### 🛡️ Security Best Practices

* 🔐 Never use Main wallets
* 🚫 Never expose sensitive credentials
* 📜 Always review code before execution
* 💸 Use burner wallets with test tokens only

---

### 💬 Need Help?

* 🐛 **Bug Reports**: [Open a GitHub Issue](https://github.com/cryptodai3/R2-Testnet-CDY/issues)
* 💡 **Channel**: Join [@cryptodai3](https://t.me/cryptodai3)
* 🌐 **Community**: Join [YetiDAO Telegram](https://t.me/YetiDAO)

---

### 🙌 Support Our Work

Love this tool? Help us improve:

* ⭐ Star the repository
* 🔗 Share with your farming community
* 💎 Use our referral codes (where applicable)
* 💡 Contribute ideas and code

---

## 📝 License

This project is licensed under the MIT License.
---

> ⭐ **Star this repo** if it helped you. Let’s grow the community together!
---

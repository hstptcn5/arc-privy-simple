# PowerShell script to setup .env file

Write-Host "🚀 Arc USDC Onboarding - Auto Setup" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path "backend\.env") {
    Write-Host "⚠️  File backend/.env already exists!" -ForegroundColor Yellow
    $response = Read-Host "Overwrite? (y/n)"
    if ($response -ne "y") {
        Write-Host "❌ Cancelled" -ForegroundColor Red
        exit 0
    }
}

# Ask user for private key
Write-Host "🔑 Enter your EVM wallet private key" -ForegroundColor Yellow
Write-Host "   (Format: 0x followed by 64 hex characters)" -ForegroundColor Gray
$privateKey = Read-Host "Private Key"

# Validate format
if (-not $privateKey.StartsWith("0x") -or $privateKey.Length -ne 66) {
    Write-Host "❌ Invalid private key format! Must be 0x + 64 hex chars" -ForegroundColor Red
    exit 1
}

# Create .env file
$envContent = @"
# Arc Network Configuration (REQUIRED)
ARC_RPC_URL=https://rpc.testnet.arc.network

# Funder Wallet (REQUIRED - for real USDC transfers)
# Private key from any EVM wallet (MetaMask, etc.)
FUNDER_PRIVATE_KEY=$privateKey

# Server Port
PORT=3001
"@

Set-Location backend
$envContent | Out-File -FilePath .env -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "✅ Created backend/.env with your private key!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Add Arc Testnet to your wallet (if not already)" -ForegroundColor White
Write-Host "   2. Get test USDC: https://faucet.circle.com" -ForegroundColor White
Write-Host "   3. Select Arc Testnet on faucet" -ForegroundColor White
Write-Host "   4. Paste your wallet address" -ForegroundColor White
Write-Host "   5. Run: cd backend && npm run dev" -ForegroundColor White
Write-Host ""
Set-Location ..


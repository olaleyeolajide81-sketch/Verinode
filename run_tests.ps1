# Gas Optimization Suite v2 Test Runner
# This script runs comprehensive tests for the gas optimization system

Write-Host "Starting Gas Optimization Suite v2 Tests" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if Python is available
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
    if (-not $pythonCmd) {
        Write-Host "Python not found. Please install Python 3.8+ to run tests." -ForegroundColor Red
        exit 1
    }
}

$pythonPath = $pythonCmd.Source
Write-Host "Found Python at: $pythonPath" -ForegroundColor Green

# Check required packages
Write-Host "Checking required Python packages..." -ForegroundColor Yellow
$packages = @("numpy", "pandas", "scikit-learn", "regex")
foreach ($package in $packages) {
    try {
        $result = & $pythonPath -c "import $package" 2>$null
        Write-Host "$package is available" -ForegroundColor Green
    } catch {
        Write-Host "$package is not installed. Run: pip install $package" -ForegroundColor Red
        exit 1
    }
}

# Run the comprehensive test
Write-Host "Running comprehensive gas optimization tests..." -ForegroundColor Yellow
try {
    & $pythonPath test_gas_optimization.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "All tests passed successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Some tests failed. Check the output above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error running tests: $_" -ForegroundColor Red
    exit 1
}

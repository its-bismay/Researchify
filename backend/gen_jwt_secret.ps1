$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$bytes = [byte[]]::new(32)
$rng.GetBytes($bytes)
[System.Convert]::ToBase64String($bytes)

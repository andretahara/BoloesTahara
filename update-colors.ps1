$files = @(
    "src/app/dashboard/EnquetesUserSection.tsx",
    "src/app/dashboard/ComentariosDominio.tsx",
    "src/app/admin/page.tsx",
    "src/app/admin/EnquetesAdminList.tsx",
    "src/app/admin/EmailsAutorizadosManager.tsx",
    "src/app/admin/CreateEnqueteForm.tsx",
    "src/app/admin/CreateBolaoForm.tsx",
    "src/app/admin/ComentariosAdminPanel.tsx",
    "src/app/boloes/page.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace 'purple-500', 'yellow-500'
        $content = $content -replace 'purple-700', 'amber-600'
        $content = $content -replace 'purple-400', 'yellow-400'
        $content = $content -replace 'purple-600', 'yellow-600'
        $content = $content -replace 'purple-300', 'yellow-300'
        Set-Content $file -Value $content -NoNewline
        Write-Host "Updated: $file"
    }
}
Write-Host "Done!"

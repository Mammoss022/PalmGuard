$ErrorActionPreference = 'Stop'
$wordApp = $null
$reportDocument = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordApp.AutomationSecurity = 3
    $reportDocument = $wordApp.Documents.Open('D:\PalmGuard\docs\PalmGuard_s_numbering_fixed.docx', $false, $false)
    $reportDocument.Repaginate()
    $null = $reportDocument.Fields.Update()
    foreach ($toc in $reportDocument.TablesOfContents) { $toc.Update() }
    $reportDocument.Repaginate()
    $null = $reportDocument.Fields.Update()
    $reportDocument.Save()
    $reportDocument.SaveAs2('C:\Users\Advice\Downloads\PalmGuard_s_numbering_fixed.docx', 16)
    Write-Output ('Saved updated report. Pages: ' + $reportDocument.ComputeStatistics(2))
} finally {
    if ($null -ne $reportDocument) { $reportDocument.Close(0) }
    if ($null -ne $wordApp) { $wordApp.Quit() }
}

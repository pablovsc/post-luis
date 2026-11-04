Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetAbsolutePathName(".")
batPath = currentDir & "\iniciar-pos-dev.bat"
cmdPath = WshShell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\cmd.exe"

desktopPath = WshShell.SpecialFolders("Desktop")
shortcutDesktop = desktopPath & "\Tienda Express POS (Modo Dev).lnk"

Set oLinkDesktop = WshShell.CreateShortcut(shortcutDesktop)
oLinkDesktop.TargetPath = cmdPath
oLinkDesktop.Arguments = "/c """ & batPath & """"
oLinkDesktop.WorkingDirectory = currentDir
oLinkDesktop.Description = "Iniciar Tienda Express POS en Modo Desarrollo (npm run dev)"
oLinkDesktop.WindowStyle = 1

If fso.FileExists(currentDir & "\public\favicon.ico") Then
    oLinkDesktop.IconLocation = currentDir & "\public\favicon.ico, 0"
ElseIf fso.FileExists(currentDir & "\app.ico") Then
    oLinkDesktop.IconLocation = currentDir & "\app.ico, 0"
End If
oLinkDesktop.Save

shortcutFolder = currentDir & "\Tienda Express POS (Modo Dev).lnk"
Set oLinkFolder = WshShell.CreateShortcut(shortcutFolder)
oLinkFolder.TargetPath = cmdPath
oLinkFolder.Arguments = "/c """ & batPath & """"
oLinkFolder.WorkingDirectory = currentDir
oLinkFolder.Description = "Iniciar Tienda Express POS en Modo Desarrollo (npm run dev)"
oLinkFolder.WindowStyle = 1
If fso.FileExists(currentDir & "\public\favicon.ico") Then
    oLinkFolder.IconLocation = currentDir & "\public\favicon.ico, 0"
ElseIf fso.FileExists(currentDir & "\app.ico") Then
    oLinkFolder.IconLocation = currentDir & "\app.ico, 0"
End If
oLinkFolder.Save

WScript.Echo "Acceso directo de Modo Dev creado exitosamente en el Escritorio."


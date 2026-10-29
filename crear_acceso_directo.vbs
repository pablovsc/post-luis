Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtener la ruta del directorio actual
currentDir = fso.GetAbsolutePathName(".")
batPath = currentDir & "\iniciar-pos-node.bat"

' Ruta del Escritorio del usuario
desktopPath = WshShell.SpecialFolders("Desktop")
shortcutDesktop = desktopPath & "\Tienda Express POS (Node).lnk"

' Crear acceso directo en el Escritorio
Set oLinkDesktop = WshShell.CreateShortcut(shortcutDesktop)
oLinkDesktop.TargetPath = batPath
oLinkDesktop.WorkingDirectory = currentDir
oLinkDesktop.Description = "Iniciar Tienda Express POS con Node.js (Sin Docker)"
oLinkDesktop.WindowStyle = 1

' Intentar asignar icono si existe
If fso.FileExists(currentDir & "\public\favicon.ico") Then
    oLinkDesktop.IconLocation = currentDir & "\public\favicon.ico, 0"
ElseIf fso.FileExists(currentDir & "\app.ico") Then
    oLinkDesktop.IconLocation = currentDir & "\app.ico, 0"
End If
oLinkDesktop.Save

' Crear también un acceso directo dentro de la carpeta del proyecto c:\app\post-luis
shortcutFolder = currentDir & "\Tienda Express POS (Node).lnk"
Set oLinkFolder = WshShell.CreateShortcut(shortcutFolder)
oLinkFolder.TargetPath = batPath
oLinkFolder.WorkingDirectory = currentDir
oLinkFolder.Description = "Iniciar Tienda Express POS con Node.js (Sin Docker)"
oLinkFolder.WindowStyle = 1
If fso.FileExists(currentDir & "\public\favicon.ico") Then
    oLinkFolder.IconLocation = currentDir & "\public\favicon.ico, 0"
ElseIf fso.FileExists(currentDir & "\app.ico") Then
    oLinkFolder.IconLocation = currentDir & "\app.ico, 0"
End If
oLinkFolder.Save

WScript.Echo "Acceso directo creado exitosamente en el Escritorio y en la carpeta del proyecto."


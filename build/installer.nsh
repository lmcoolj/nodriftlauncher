; Custom NSIS installer tweaks for NodriftLauncher.
; electron-builder invokes these macros at the matching points in its NSIS script.

!macro customHeader
  ; Branding shown in the installer's title.
  BrandingText "NodriftLauncher — nodrift_labs"
!macroend

!macro customInstall
  DetailPrint "Installing NodriftLauncher (Minecraft launcher by nodrift_labs)…"
!macroend

!macro customUnInstall
  DetailPrint "Removing NodriftLauncher. Your instances and data in %APPDATA%\\nodriftlauncher are left intact."
!macroend

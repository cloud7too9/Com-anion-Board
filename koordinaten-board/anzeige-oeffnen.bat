@echo off
rem Oeffnet die Anzeige im Edge-Kiosk mit dem Anzeige-Link, den der Server nach server\daten\anzeige-link.txt schreibt.
rem Ohne Link ist kein Geraet Anzeige, auch der Board-Rechner nicht (Umbau Phase 1).
set "LINK_DATEI=%~dp0server\daten\anzeige-link.txt"
if not exist "%LINK_DATEI%" (
  echo Anzeige-Link noch nicht da: %LINK_DATEI% - Link aus der Konsole des Servers nehmen.
  exit /b 1
)
set /p LINK=<"%LINK_DATEI%"
start msedge --kiosk "%LINK%" --edge-kiosk-type=fullscreen --no-first-run

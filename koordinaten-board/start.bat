@echo off
rem Koordinaten-Board starten: Server + Anzeige im Vollbild (Edge-Kiosk)
rem Die Anzeige braucht auch auf dem Board-Rechner ihren Anzeige-Link (server\daten\anzeige-link.txt, schreibt der Server).
cd /d "%~dp0"

if not exist server\node_modules (
  echo Installiere Abhaengigkeiten ...
  call npm run installieren || goto fehler
)
if not exist client\dist (
  echo Baue Oberflaeche ...
  call npm run build || goto fehler
)

rem Beim ersten Start: Firewall fuer Handys im WLAN freigeben (einmalige Admin-Abfrage)
netsh advfirewall firewall show rule name="Koordinaten-Board" >nul 2>&1
if errorlevel 1 (
  echo Firewall-Regel fehlt noch - Handys koennten sonst nicht verbinden.
  call "%~dp0firewall-freigeben.bat"
)

rem Anzeige nach kurzer Wartezeit im Vollbild oeffnen - mit dem Anzeige-Link aus der Datei des Servers
start "" cmd /c "timeout /t 3 >nul && call "%~dp0anzeige-oeffnen.bat""

rem node:sqlite meldet sich sonst als "experimental"
node --disable-warning=ExperimentalWarning server\src\server.js
goto :eof

:fehler
echo.
echo Fehler beim Vorbereiten. Ist Node.js installiert und im PATH?
pause

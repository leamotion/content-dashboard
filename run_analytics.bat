@echo off
:: Wrapper called by Windows Task Scheduler every 6 hours.
:: Adjust PYTHON_PATH if your Python executable is elsewhere.

set SCRIPT_DIR=%~dp0
set PYTHON_PATH=python

cd /d "%SCRIPT_DIR%"
"%PYTHON_PATH%" fetch_analytics.py >> analytics_fetch.log 2>&1

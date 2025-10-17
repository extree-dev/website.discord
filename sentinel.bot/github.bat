@echo off
cd "E:\sentinel\sentinel"

:: Добавляем файлы, кроме указанных в .gitignore
git add --all

:: Создаем файл .gitignore, если его нет
if not exist .gitignore (
    echo src/utils/ >> .gitignore
    echo src/event/ >> .gitignore
    echo .env >> .gitignore
)

:: Добавляем изменения в индекс
git add -f .gitignore  :: Используем -f для добавления .gitignore

:: Делаем коммит
git commit -m "Autpcommit: update"

:: Проверяем, существует ли ветка LEWISBOT
git checkout -b SENTINEL 2>nul

:: Проверяем наличие удалённого репозитория
git remote -v
if errorlevel 1 (
    echo Adding remote repository...
    git remote add origin https://github.com/extree-dev/Sentinel.git
)

:: Сначала выполняем pull с флагом для разрешения разных историй
git pull origin SENTINEL --allow-unrelated-histories

:: Отправляем изменения на GitHub
git push origin SENTINEL

echo The commit is completed and the changes are sent to GitHub!
pause

import React from 'react';
import './CommandList.css';

function CommandList() {
  // Массив с данными о дополнениях (командах)
  const commands = [
    {
        name: 'calc',
        description: 'Калькулятор, позволяющий выполнять арифметические операции',
        install: 'registercommand https://store.ne-dos.ru/calc'
    },
    {
        name: 'clock',
        description: 'Часы, показывающие текущее время и дату',
        install: 'registercommand https://store.ne-dos.ru/clock'
    },
    {
        name: 'snake',
        description: 'Классическая игра Змейка, в которой нужно собирать еду и не врезаться в стены или хвост',
        install: 'registercommand https://store.ne-dos.ru/snake'
    },
    {
        name: 'chat',
        description: 'Чат, позволяющий общаться с другими пользователями NE-DOS',
        install: 'registercommand https://store.ne-dos.ru/chat'
    },
    {
        name: 'paint',
        description: 'Графический редактор, позволяющий рисовать и сохранять изображения',
        install: 'registercommand https://store.ne-dos.ru/paint'
    },
    {
        name: 'music',
        description: 'Музыкальный плеер, позволяющий воспроизводить и загружать музыкальные файлы',
        install: 'registercommand https://store.ne-dos.ru/music'
    },
    {
        name: 'browser',
        description: 'Веб-браузер, позволяющий просматривать веб-страницы в интернете',
        install: 'registercommand https://store.ne-dos.ru/browser'
    },
    {
        name: 'todo',
        description: 'Список дел, позволяющий добавлять, удалять и отмечать задачи',
        install: 'registercommand https://store.ne-dos.ru/todo'
    },
    {
        name: 'weather',
        description: 'Погода, показывающая текущую температуру, влажность и прогноз на ближайшие дни',
        install: 'registercommand https://store.ne-dos.ru/weather'
    },
    {
        name: 'quiz',
        description: 'Викторина, в которой нужно отвечать на вопросы по разным темам',
        install: 'registercommand https://store.ne-dos.ru/quiz'
    },
    {
        name: 'www',
        description: 'Открывает ссылку в новой вкладке',
        install: 'registercommand https://store.ne-dos.ru/www'
    },
    {
        name: 'github',
        description: 'Открывает репозиторий проекта на GitHub',
        install: 'registercommand https://store.ne-dos.ru/github'
    }
    
  ];

  return (
    <div className="CommandList">
      {commands.map((command) => (
        <div className="command" key={command.name}>
          <h3>{command.name}</h3>
          <p>{command.description}</p>
          <code>{command.install}</code>
        </div>
      ))}
    </div>
  );
}

export default CommandList;

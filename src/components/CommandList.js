import React from 'react';
import './CommandList.css';

function CommandList() {
  // Массив с данными о дополнениях (командах)
  const commands = [
    {
      name: 'calc',
      description: 'Калькулятор, позволяющий выполнять арифметические операции',
      install: 'registercommand https://nedos-store.com/calc'
    },
    {
      name: 'clock',
      description: 'Часы, показывающие текущее время и дату',
      install: 'registercommand https://nedos-store.com/clock'
    },
    {
      name: 'snake',
      description: 'Классическая игра Змейка, в которой нужно собирать еду и не врезаться в стены или хвост',
      install: 'registercommand https://nedos-store.com/snake'
    },
    {
      name: 'chat',
      description: 'Чат, позволяющий общаться с другими пользователями NE-DOS',
      install: 'registercommand https://nedos-store.com/chat'
    },
    {
      name: 'paint',
      description: 'Графический редактор, позволяющий рисовать и сохранять изображения',
      install: 'registercommand https://nedos-store.com/paint'
    },
    {
      name: 'music',
      description: 'Музыкальный плеер, позволяющий воспроизводить и загружать музыкальные файлы',
      install: 'registercommand https://nedos-store.com/music'
    },
    {
      name: 'browser',
      description: 'Веб-браузер, позволяющий просматривать веб-страницы в интернете',
      install: 'registercommand https://nedos-store.com/browser'
    },
    {
      name: 'todo',
      description: 'Список дел, позволяющий добавлять, удалять и отмечать задачи',
      install: 'registercommand https://nedos-store.com/todo'
    },
    {
      name: 'weather',
      description: 'Погода, показывающая текущую температуру, влажность и прогноз на ближайшие дни',
      install: 'registercommand https://nedos-store.com/weather'
    },
    {
      name: 'quiz',
      description: 'Викторина, в которой нужно отвечать на вопросы по разным темам',
      install: 'registercommand https://nedos-store.com/quiz'
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

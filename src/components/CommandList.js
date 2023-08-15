import React from 'react';
import './CommandList.css';

function CommandList() {
  // Массив с данными о дополнениях (командах)
  const commands = [
    {
        name: 'calc',
        description: 'Калькулятор, позволяющий выполнять арифметические операции'
    },
    {
        name: 'clock',
        description: 'Часы, показывающие текущее время и дату'
    },
    {
        name: 'snake',
        description: 'Классическая игра Змейка, в которой нужно собирать еду и не врезаться в стены или хвост'
    },
    {
        name: 'chat',
        description: 'Чат, позволяющий общаться с другими пользователями NE-DOS'
    },
    {
        name: 'paint',
        description: 'Графический редактор, позволяющий рисовать и сохранять изображения'
    },
    {
        name: 'music',
        description: 'Музыкальный плеер, позволяющий воспроизводить и загружать музыкальные файлы'
    },
    {
        name: 'browser',
        description: 'Веб-браузер, позволяющий просматривать веб-страницы в интернете'
    },
    {
        name: 'todo',
        description: 'Список дел, позволяющий добавлять, удалять и отмечать задачи'
    },
    {
        name: 'weather',
        description: 'Погода, показывающая текущую температуру, влажность и прогноз на ближайшие дни'
    },
    {
        name: 'quiz',
        description: 'Викторина, в которой нужно отвечать на вопросы по разным темам'
    },
    {
        name: 'www',
        description: 'Открывает ссылку в новой вкладке'
    },
    {
        name: 'github',
        description: 'Открывает репозиторий проекта на GitHub'
    },
    {
        name: 'command',
        description: 'Здесь должно быть описание команды'
    },
    {
        name: 'confetti',
        description: 'Здесь должно быть описание команды'
    },
    {
        name: 'reboot',
        description: 'Здесь должно быть описание команды'
    }
    
  ];

  return (
    <div className="CommandList">
      {commands.map((command) => (
        <div className="command" key={command.name}>
          <h3>{command.name}</h3>
          <p>{command.description}</p> 
          <code>cmd install {command.name}</code>
        </div>
      ))}
    </div>
  );
}

export default CommandList;

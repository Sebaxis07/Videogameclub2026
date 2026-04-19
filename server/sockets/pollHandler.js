"use strict";

let currentPoll = null;

module.exports = function(io) {
  io.on('connection', (socket) => {
    
    // When a user connects, send the current poll state if there is one
    if (currentPoll) {
       socket.emit('poll:state', currentPoll);
    }

    socket.on('admin:start-poll', (pollData) => {
      // pollData: { question: "...", options: ["A", "B", ...] }
      currentPoll = {
        question: pollData.question,
        options: pollData.options.map(opt => ({ text: opt, votes: 0 })),
        active: true,
        votedUsers: []
      };
      io.emit('poll:state', currentPoll);
    });

    socket.on('admin:close-poll', () => {
      if (currentPoll) {
        currentPoll.active = false;
        io.emit('poll:state', currentPoll);
      }
    });
    
    socket.on('admin:clear-poll', () => {
      currentPoll = null;
      io.emit('poll:state', currentPoll);
    });

    socket.on('student:vote-poll', ({ rut, optionIndex }) => {
      if (!currentPoll || !currentPoll.active) return;
      
      const userRef = rut || socket.id;
      if (currentPoll.votedUsers.includes(userRef)) return;

      if (currentPoll.options[optionIndex]) {
        currentPoll.options[optionIndex].votes += 1;
        currentPoll.votedUsers.push(userRef);
        
        io.emit('poll:state', currentPoll);
      }
    });

  });
};

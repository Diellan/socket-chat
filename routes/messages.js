exports.index = function(req, res) {
  res.app.get('connection').query( 'SELECT * FROM MESSAGES', function(err,
rows) {
    if (err) {
      res.send(err);
    } else {
      console.log(JSON.stringify(rows));
      res.render('message', {title: 'Chat Messages', messages: rows});
  }});
};
exports.add_message = function(req, res){
  var input = req.body.message;
  var message = { UserID: input.UserID,
	RoomID: input.RoomID, Message: input.Message, Impersonate: input.Impersonate};
  console.log('Request to log message:' + JSON.stringify(message));
  req.app.get('connection').query('INSERT INTO MESSAGES set ?', message, function(err) {
      if (err) {
        res.send(err);
      } else {
        res.redirect('/messages');
      }
   });
};

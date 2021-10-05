# Run server
nohup npm start &>> application.log 2>> application_stderr.log & echo $!> run.pid

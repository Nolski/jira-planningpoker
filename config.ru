require './server'

#File.delete("log/sinatra.log")
#log = File.new("log/sinatra.log", "a+")
#$stdout.reopen(log)
#$stderr.reopen(log)

run Sinatra::Application

require './server'
require 'bundler'

#File.delete("log/sinatra.log")
#log = File.new("log/sinatra.log", "a+")
#$stdout.reopen(log)
#$stderr.reopen(log)

Bundler.require

run Sinatra::Application

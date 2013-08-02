require 'rubygems'
require "bundler/setup"
require_relative 'model'
require 'sinatra'
require 'json'
require 'pp'
require 'sinatra-websocket'


helpers do
	def loggedInUser
		User.get(session[:username])

	end

	def protect
		if User.get(session[:username]).nil?
			halt 403, "Login required"
		end
	end

	def getGame(id)
		game = Game.get(id)
		halt 404, "No such game" if game.nil?
		game
	end
	def getStory(gameId, ticketNo)
		story = Story.first(:game_id => gameId, :ticket_no => ticketNo)
		halt 404 if story.nil?
		return story
	end

	#send the message to all connected websocket clients
	#use json, please!
	def broadcast(message)
		EM.next_tick { settings.sockets.each{|s| s.send(message) } }
	end

	
end

configure do
	#TODO: set environment, port as desired
	enable :static
	enable :sessions
	set :sessions, true

	set :session_secret, "vM1IAofoUlBl57bDYzmJ"
	set :protection, :origin_whitelist => ['chrome-extension://hgmloofddffdnphfgcellkdfbfbjeloo']
	#set :protection, except: :session_hijacking
	disable :protection

	set :sockets, Array.new
end

#debug
get '/viewsession' do
	out = String.new
	out << session.inspect
	out
end

before do
	protect unless request.path_info.start_with?("/login")
	content_type :json
end


########
#Authentication
########
#you have to be logged in for pretty much everything


#Post a 'username', and we'll call that user logged in
#maybe there will be a password in the future
#NOTE! Unlike every other endpoint here, don't post json in the body, use a form url encoded
#Returns: the text 'true' or 'false' depending on whether login was successfull
post '/login' do
	username = params['username']
	#puts User.get(username).to_hash
	user = User.first_or_create(:username => username)
	session[:username] = username
	user.to_hash.to_json
end

#Get the currently logged in user
#Json
get '/login' do
	user = loggedInUser
	user = user.to_hash unless user.nil?
	user.to_json
end

#logout
delete '/login' do
	session[:username] = nil
end

##########
#Game mgmt
##########

#make a game
#optionally, post a json hash with 'name' => 'the name of the game'
#returns the game, you'll want the id from this
post '/game' do
	game = Game.new
	game.created = Time.now
	game.moderator = loggedInUser
	body = request.body.read
	if !body.nil? && !body.empty?
		data = JSON.parse(body)
		if data.has_key?('name') then game.name = data['name'] end
	end
	if !game.save 
		pp game.errors
		halt 500, "Could not create game"
	end
	game.to_hash.to_json
end

#Pass an object with properties to change. Just name is supported now.
#you must be logged in as the moderator
#returns the game
put '/game/:id' do
	game = getGame(params[:id].to_i)
	if loggedInUser != game.moderator
		halt 403, "You must be the moderator to edit this game"
	end

	data = JSON.parse(request.body.read)
	if data.has_key?('name')
		game.name = data['name']
	end
	if !game.save 
		pp game.errors
		halt 500, "Could not edit game"
	else
		broadcast({:game => game.to_hash}.to_json)
	end
	game.to_hash.to_json
end

#Get a game
get '/game/:id' do
	game = getGame(params[:id].to_i)
	game.to_hash.to_json
end

#######
#participant mgmt
#######

get '/game/:id/participants' do
	game = getGame(params[:id].to_i)
	(game.participants.map {|user| user.to_hash}).to_json
end

#join the game
#no parameters required
#TODO: fail nicer
post '/game/:id/participants' do
	game = getGame(params[:id].to_i)
	game.participants << loggedInUser
	if !game.save 
		halt 500, "A database error occured"
	else
		broadcast({:game => game.to_hash}.to_json)
		true
	end
end

#TODO: removing users and their estimates

#######
#Stories
#######

#gets full info on all story in the game
#note: should this just be ticket no.s?
get '/game/:id/story' do
	game = getGame(params[:id].to_i)
	(game.stories.map {|story| story.to_hash}).to_json
end

#give a hash of parameters for the new story, currently only ticket_no is supported and *required*
post '/game/:id/story' do
	game = getGame(params[:id].to_i)
	if loggedInUser != game.moderator
		halt 403, "You must be the moderator to edit this game"
	end
	body = request.body.read
	pp body
	halt 400, "No data received" if body.empty?
	data = JSON.parse(body)
	halt 400, "Ticket number is required" unless data.has_key?('ticket_no')
	story = Story.create(:ticket_no => data['ticket_no'], :game => game)
	halt 500, "Could not save record.\n#{story.errors.inspect}" if !story.saved?
	broadcast({:story => story.to_hash}.to_json)
	story.to_hash.to_json
end

delete '/game/:game/story/:ticket' do
		story = getStory(params[:game].to_i, params[:ticket])
		broadcast({:game => story.game.to_hash}.to_json)
		story.destroy.to_json
end

get '/game/:game/story/:ticket' do
		story = getStory(params[:game].to_i, params[:ticket])
		story.to_hash.to_json
end

#you may change the completeness of a story, by passing {"complete" : true}
put '/game/:game/story/:ticket' do
	story = getStory(params[:game].to_i, params[:ticket])
	game = story.game
	if loggedInUser != game.moderator
		halt 403, "You must be the moderator to edit this game"
	end

	data = JSON.parse(request.body.read)
	if data.has_key?('complete')
		story.complete = data['complete']
	end
	if !story.save 
		pp story.errors
		halt 500, "Could not edit story"
	else
		broadcast({:story => story.to_hash}.to_json)
	end
	story.to_hash.to_json
end
##########
#Estimates
##########

#add your estimate
#pass json object with vote OR a form field with vote.
#any previous vote will be overritten
# if all votes are in the story will be marked as complete
post '/game/:game/story/:ticket/estimate' do
	if !params[:vote].nil?
		vote = params[:vote].to_f
	else
		vote = JSON.parse(request.body.read)['vote'].to_f
	end
	pp vote
	story = getStory(params[:game].to_i, params[:ticket])
	user = loggedInUser
	estimate = Estimate.first(:story => story, :user => user)
	unless estimate.nil? then estimate.destroy! end
	estimate = Estimate.create(:story => story, :user => user, :vote => vote, :made_at => Time.now)
	broadcast({:story => story.to_hash}.to_json)
	estimate.to_hash.to_json
end

#get just the estimates
#votes will not show if story is incomplete
get '/game/:game/story/:ticket/estimate' do
	story = getStory(params[:game].to_i, params[:ticket])
	(story.estimates.map { |e| e.to_hash }).to_json
end

#######
#Websocket stuff
#######

get '/websocket' do
	if !request.websocket? then halt 400, "Connect a websocket here, not http" end
	request.websocket do |ws| 
		ws.onopen do
			ws.send("connected")
			settings.sockets << ws
		end
		ws.onmessage do |msg|
		#nothing
		end
		ws.onclose do
			puts "socket closed"
			settings.sockets.delete(ws)
		end
	end
end

	

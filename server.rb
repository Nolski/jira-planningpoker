require 'rubygems'
require "bundler/setup"
require './model'
require 'sinatra'
require 'json'
require 'pp'
require 'sinatra-websocket'
require 'rest-client'
require 'pusher'

#class Net::HTTPSession
	#def ssl_version=(value)
	#end
#end
helpers do
	def loggedInUser
		User.get(session[:username])

	end

	def protect
		if User.get(session[:username]).nil?
			content_type :text
			halt 403, "Login required"
		end
	end

	def getGame(id)
		game = Game.get(id)
		content_type :text
		halt 404, "No such game" if game.nil?
		game
	end
	def preventModClosed(game)
		if game.closed
			content_type :text
			halt 404, "This game is closed and cannot be changed"
		end
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
	
	#for RestClient
	def authHash
		{:user => session[:username], :password => session[:password]}
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

	set :jira_url, 'https://request.siteworx.com'
	#Don't know if this is static. Can be found at https://JIRA/rest/api/2/field
	set :story_points_customid, 10183
	
	if settings.development?
		#For local use only, production keys autoconfigured when running on heroku
		Pusher.app_id = '51163'
		Pusher.key    = '32de1f05aeb0cce00299'
		Pusher.secret = '0d8dd90217332c305441'
	end
end

#debug
get '/viewsession' do
	out = String.new
	out << session.inspect
	out
end

before do
	path = request.path_info
	protect unless path.start_with?("/login") ||  path == '/' || path=='/gamesList'
	content_type :json
end


get '/' do
	redirect to((loggedInUser.nil?) ? 'login.html' : 'gamesList')
end
########
#Authentication
########
#you have to be logged in for pretty much everything


#post a username and password. We check that against JIRA and store it in the encrypted client-side session
#NOTE! Unlike every other endpoint here, don't post json in the body, use a form url encoded
post '/login' do
	username = params['username']
	password = params['password']

	#debug
	if (settings.development? && username=='test')
		session[:username] = username;
		session[:password] = password;
		user = User.first_or_create(:username => username)
		return user.to_hash.to_json;
	end


	#check this with JIRA
	resource = RestClient::Resource.new(settings.jira_url+'/rest/gadget/1.0/currentUser', {:user => username, :password => password})
	#will throw exceptions on login failure
	begin
		response = resource.get
		jiraInfo = JSON.parse(response)
		user = User.first_or_create(:username => username, :fullname => jiraInfo['fullName'])
		session[:username] = username
		session[:password] = password
		status 200
		user.to_hash.to_json
	rescue Exception => e
		content_type :html
		halt e.http_code, e.http_body
		#raise e
		e.inspect
	end
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
	game.participants = [loggedInUser]
	body = request.body.read
	if !params[:name].nil?
		game.name = params[:name] unless params[:name].nil?
	elsif  !body.nil? && !body.empty?
		data = JSON.parse(body)
		if data.has_key?('name') then game.name = data['name'] end
	end
	if !game.save 
		pp game.errors
		halt 500, "Could not create game"
	end
	game.to_hash.to_json
end
#Get all the open games
get '/game' do
	games = Game.all(:closed => false, :order => [:created.asc], :fields => [:id, :name])
	result = Array.new
	games.each do |game|
		result << {:id => game.id, :name => game.name}
	end
	return result.to_json
end


#Pass an object with properties to change. Just name is supported now.
#you must be logged in as the moderator
#returns the game
put '/game/:id' do
	game = getGame(params[:id].to_i)
	preventModClosed(game)
	if loggedInUser != game.moderator
		halt 403, "You must be the moderator to edit this game"
	end

	body = request.body.read
	if !params[:name].nil?
		game.name = params[:name] unless params[:name].nil?
	elsif !body.nil? && !body.empty?
		data = JSON.parse(body)
		if data.has_key?('name')
			game.name = data['name']
		end
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

delete '/game/:id' do
	game = getGame(params[:id].to_i)
	game.closed = true
	game.save
	Pusher.trigger("game_#{params[:id]}", 'closed', true)
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
	preventModClosed(game)
	game.participants << loggedInUser
	if !game.save 
		halt 500, "A database error occured"
	else
		broadcast({:game => game.to_hash}.to_json)
		Pusher.trigger("game_#{params[:id]}", 'joined', loggedInUser.to_hash)
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
	list = Hash.new
	game.stories.each do |story|
		list[story.ticket_no] = story.to_hash
	end
	return list.to_json
	#(game.stories.map {|story| {story.ticket_no => story.to_hash}}).to_json
end

#give a hash of parameters for the new story, currently only ticket_no is supported and *required*
post '/game/:id/story' do
	game = getGame(params[:id].to_i)
	if loggedInUser != game.moderator
		halt 403, "You must be the moderator to edit this game"
	end
	preventModClosed(game)
	body = request.body.read
	ticket_no = nil
	if !params[:ticket_no].nil?
		ticket_no = params[:ticket_no]
	elsif !body.nil? && !body.empty?
		data = JSON.parse(body)
		ticket_no = data['ticket_no']
	else
		halt 400, "No data received" if body.empty?
	end

	halt 400, "Ticket number required" if ticket_no.nil?

	story = Story.create(:ticket_no => ticket_no, :game => game, :created => Time.now)

	#get jira details
	begin
		resource = RestClient::Resource.new(settings.jira_url+"/rest/api/2/issue/#{story.ticket_no}", authHash)
		ticketInfo = JSON.parse(resource.get)
		story.summary = ticketInfo['fields']['summary']
		story.description = ticketInfo['fields']['description']
		if ticketInfo['fields'].key?("customfield_#{settings.story_points_customid}")
			story.story_points = ticketInfo['fields']['customfield_10183']
			#TODO: Figure out if it always has the same key
		end
		story.save
	rescue
		puts "Could not get JIRA data for #{story.ticket_no}"
	end

	#set this as the current story if there isn't one
	if game.current_story.nil?
		game.current_story = story.ticket_no
		game.save
		Pusher.trigger("game_#{params[:game]}", 'current_story', story.to_hash)
	end


	puts story.errors.inspect if !story.saved?
	halt 500, "Could not save record.\n#{story.errors.inspect}" if !story.saved?
	broadcast({:story => story.to_hash}.to_json)
	Pusher.trigger("game_#{params[:id]}", 'new_story', story.to_hash)
	story.to_hash.to_json
end

delete '/game/:game/story/:ticket' do
		story = getStory(params[:game].to_i, params[:ticket])
		preventModClosed(story.game)
		broadcast({:game => story.game.to_hash}.to_json)
		Pusher.trigger("game_#{params[:game]}", 'deleted_story', params[:ticket])
		story.destroy.to_json
end

get '/game/:game/story/:ticket' do
		story = getStory(params[:game].to_i, params[:ticket])
		story.to_hash.to_json
end

#you may change the flippedness or points of a story, by passing {"flipped" : true, "story_points" : 2}
#story points will attempt to be set on JIRA
put '/game/:game/story/:ticket' do
	story = getStory(params[:game].to_i, params[:ticket])
	game = story.game
	preventModClosed(game)
	if loggedInUser != game.moderator
		halt 403, "You must be the moderator to edit this game"
	end

	if !params[:flipped].nil? || !params[:story_points].nil?
		if !params[:flipped].nil?
			story.flipped = params[:flipped] == 'true'
		end
		if !params[:story_points].nil?
			story.story_points = params[:story_points].to_f
		end
	else
		body = request.body.read
		data = JSON.parse(body)
		story.flipped = data['flipped'] unless data['flipped'].nil?
		story.story_points = data['story_points'].to_f unless data['story_points'].nil?
	end

	unless story.story_points.nil?
		begin
			#update JIRA
			resource = RestClient::Resource.new(settings.jira_url+"/rest/api/2/issue/#{story.ticket_no}", authHash)
			updates = {'fields' => {"customfield_#{settings.story_points_customid}" => story.story_points.to_f}}
			resource.put updates.to_json, :content_type => :json, :accept => :json
		rescue Exception => e
			puts "An error occured while updating a story point value on JIRA"
			puts e
		end
	end

	
	if !story.save 
		pp story.errors
		halt 500, "Could not edit story\n"+story.errors.inspect
	else
		broadcast({:story => story.to_hash}.to_json)
		Pusher.trigger("game_#{params[:game]}", 'updated_story', story.to_hash)
		#g_h = game.to_hash
		#using the logic in game, push the full object of the "current story" of one exists
		#if g_h.key?(:current_story) && !g_h[:current_story].nil?
			#Pusher.trigger("game_#{params[:game]}", 'current_story', getStory(game.id, g_h[:current_story]).to_hash)
		#end
	end
	story.to_hash.to_json
end

post '/game/:game/goto-story/:ticket' do
	game = getGame(params[:game].to_i)
	if loggedInUser != game.moderator
		halt 403, "You must be the moderator to move to another ticket"
	end
	#todo validation
	halt 404 unless (game.stories(:fields => [:ticket_no]).map { |s| s.ticket_no}).include?(params[:ticket])
	game.current_story = params[:ticket]
	game.save
	Pusher.trigger("game_#{params[:game]}", 'current_story', getStory(game.id, params[:ticket]).to_hash)
end

post '/game/:game/goto-next-story' do
	game = getGame(params[:game].to_i)
	ticket_no = nil
	begin
		ticket_no =  game.stories(:order => [:created.asc], :flipped => false, :fields => [:ticket_no]).first.ticket_no
	rescue
		return false
	end
	call env.merge("PATH_INFO" => "/game/#{params[:game]}/goto-story/#{ticket_no}")
	return ticket_no
end
	

	
##########
#Estimates
##########

#add your estimate
#pass json object with vote OR a form field with vote.
#any previous vote will be overritten
# if all votes are in the story will be marked as flipped
post '/game/:game/story/:ticket/estimate' do
	if !params[:vote].nil?
		vote = params[:vote].to_f
	else
		vote = JSON.parse(request.body.read)['vote'].to_f
	end
	story = getStory(params[:game].to_i, params[:ticket])
	preventModClosed(story.game)
	user = loggedInUser
	unless story.game.participants.include?(user)
		halt 403, "You must be in this game to make an estimate on its stories"
	end
	estimate = Estimate.first(:story => story, :user => user)
	unless estimate.nil? then estimate.destroy! end
	estimate = Estimate.create(:story => story, :user => user, :vote => vote, :made_at => Time.now)

	#mark as flipped if everyone is done estimating
	oldFlipped = story.flipped
	story.flipped = story.flipped || story.estimates.length == story.game.participants.length
		
	story.save

	#if the story was auto-flippedd, send a story updated notification
	if oldFlipped!=story.flipped
		Pusher.trigger("game_#{params[:game]}", 'updated_story', story.to_hash)
	end

	broadcast({:story => story.to_hash}.to_json)
	est_h = estimate.to_hash
	est_h['ticket_no'] = story.ticket_no
	Pusher.trigger("game_#{params[:game]}", 'estimate', est_h)
	estimate.to_hash.to_json
end

#get just the estimates
#votes will not show if story is inflipped
get '/game/:game/story/:ticket/estimate' do
	story = getStory(params[:game].to_i, params[:ticket])
	(story.estimates.map { |e| e.to_hash }).to_json
end

#clear all the estimates and start a new round
delete '/game/:game/story/:ticket/estimate' do
	story = getStory(params[:game].to_i, params[:ticket])
	preventModClosed(story.game)
	if loggedInUser != story.game.moderator
		halt 403, "You must be the moderator to clear all the estimates"
	end
	if story.estimates.destroy
		Pusher.trigger("game_#{params[:game]}", 'new_round', {:ticket_no => params[:ticket], :estimates => []})
	end
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


#########
#Views
#########
get '/gamesList' do
	content_type :html
	if (loggedInUser.nil?) then redirect to('login.html') end
	@games = Game.all(:closed => false, :order => [:created.asc], :fields => [:id, :name])
	erb :join
end

require 'rubygems'
require "bundler/setup"
require 'data_mapper'

DataMapper::Logger.new($stdout, :debug)
#DataMapper.setup(:default, "sqlite://#{Dir.pwd}/db.db")
DataMapper.setup(:default, ENV['DATABASE_URL'] || "sqlite://#{Dir.pwd}/db.db")
class Game
	include DataMapper::Resource

	belongs_to :moderator, :model => 'User', :required => true
	has n, :participants, 'User', :through => Resource
	has n, :stories
	property :id, Serial
	property :name, String, :length => 160
	property :created, DateTime, :required => true
	property :closed, Boolean, :default => false

	def name
		cname = super
		((cname.nil?) ? "#{moderator.fullname}'s Game (\##{id})" : cname)	
	end
	def to_hash
		result = {
			:id => id,
			:name => name,
			:created => created,
			:stories => Array.new,
			:moderator => moderator.to_hash,
			:participants => participants.map {|user| user.to_hash},
			:current_story => nil,
			:closed => closed
		}
		#TODO: make more efficient
		stories(:order => [:created.asc]).each do |story|
			result[:stories] << story.ticket_no
			if result[:current_story].nil? && !story.complete
				result[:current_story] = story.ticket_no
			end
		end
		return result
	end

end
class User
	include DataMapper::Resource

	property :username, String, :key => true
	property :fullname, String
	#property :session_id, String

	def to_hash
		{
			:username => username,
			:fullname => fullname
		}
	end
	def fullname
		if super.nil?
			username
		else
			super
		end
	end

end
class Estimate
	include DataMapper::Resource

	belongs_to :story, :key => true
	belongs_to :user, :key => true

	property :vote, Float, :required => true
	property :made_at, DateTime, :required => true

	def to_hash
		result = { :user => user.to_hash, :made_at => made_at}
		result[:vote] = vote if story.complete
		return result
	end
end
class Story
	include DataMapper::Resource

	belongs_to :game 
	has n, :estimates

	property :ticket_no, String, :required => true
	property :complete, Boolean, :default => false
	property :summary, Text
	property :description, Text
	property :story_points, Float
	property :created, DateTime, :required => true

	property :id, Serial

	def to_hash
		h = {
			:game_id => game_id,
			:ticket_no => ticket_no,
			:summary => summary,
			:description => description,
			:estimates => estimates.map {|estimate| estimate.to_hash},
			:complete => complete,
			:sister_stories => game.stories.map {|s| s.ticket_no}
		}
		h[:story_points] = unless story_points.nil? then story_points else -1 end
		return h
	end
	validates_uniqueness_of :ticket_no, :scope => :game
end
DataMapper.auto_upgrade!

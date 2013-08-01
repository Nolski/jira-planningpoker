require 'rubygems'
require 'data_mapper'

DataMapper::Logger.new($stdout, :debug)
DataMapper.setup(:default, "sqlite://#{Dir.pwd}/db.db")
class Game
	include DataMapper::Resource

	belongs_to :moderator, :model => 'User', :required => true
	has n, :participants, 'User', :through => Resource
	has n, :stories
	property :id, Serial
	property :name, String, :length => 160
	property :created, DateTime, :required => true

	def to_hash
		{
			:id => id,
			:name => ((name.nil?) ? "#{moderator.fullname}'s Game (\##{id})" : name),
			:created => created,
			:moderator => moderator.to_hash,
			:stories => stories.map {|story| story.ticket_no},
			:participants => participants.map {|user| user.to_hash},
		}
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

	property :vote, Decimal, :required => true
	property :made_at, DateTime, :required => true

	def to_hash
		result = { :user => user.to_hash, :made_at => made_at}
		result[:vote] = vote.to_s('F') if story.complete
		return result
	end
end
class Story
	include DataMapper::Resource

	belongs_to :game 
	has n, :estimates

	property :ticket_no, String, :required => true
	property :complete, Boolean, :default => false
	property :id, Serial

	def to_hash
		{
			:game_id => game_id,
			:ticket_no => ticket_no,
			:estimates => estimates.map {|estimate| estimate.to_hash},
			:complete => complete
		}
	end
	validates_uniqueness_of :ticket_no, :scope => :game
end
DataMapper.auto_upgrade!

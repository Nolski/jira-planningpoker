require 'SecureRandom'
require 'digest/sha2'
class Admin
	include DataMapper::Resource
	
	property :username, String, :required => true, :key => true
	property :pass_hash, String, :required => true, :length => 256

	property :salt, String, :required => true

	#create a new user and return it
	def self.makeUser(username, password)
		salt = SecureRandom.base64
		h = Digest::SHA2.new(256) << (salt+password)
		self.create(:username => username, :pass_hash => h.to_s, :salt => salt)
	end

	#get a user with the right credentials
	def self.authenticate(username, password)
		user = self.get(username)
		if user.nil? then return nil end
		h = Digest::SHA2.new(256) << (user.salt + password)
		if h.to_s == user.pass_hash
			return user
		else
			return nil
		end
	end
end

class Settings
	include DataMapper::Resource
	
	property :setting_key, String, :required => true, :key => true
	property :value, String, :length => 255
end
		
		

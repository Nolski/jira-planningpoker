$(document).ready(function() {
	//getGames();
	$('#new-btn').click(function makeGame( id, callback ) {
		var url = '/game',
			name = $('#new').val(),
			data = {
				name: name
			};

		$.ajax({
			url: url,
			type: 'POST',
			data: data,
			success: function( data, textStatus, jqXHR ) {
				var gameInfo = data;
				window.location = '/showgame?id=' + gameInfo.id;
				return gameInfo;
			},
			error: function( jqXHR, textStatus, errorThrown ) {
				console.log('ERROR: ', errorThrown);
				return null;
			}
		});
	});
});

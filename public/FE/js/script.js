var id;
var socket;

$(document).ready(function(){
		
	id = getURLParameter('id');

	$('.card').hover(function() {
		$(this).animate({
			'top': '5px'
		}, 75);
	}, function() {
		$(this).animate({
			'top': '0px'
		}, 75);
	});

	$('.result-card').hover(function() {
		var id = $(this).attr("id");
		$(this).tooltip();
	});

	$('.card').click(function() {
		console.log($(this).attr('value'));
	});

	socket = new WebSocket('ws://localhost:9393');
});

socket.onopen = function(evt) {
	//stuff
}

socket.onmessage = function(evt) {
	var message = JSON.parse(evt);
	console.log(message);
}

socket.onclose = function(evt) {
	//stuffthings
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}
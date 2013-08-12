$(document).ready(function(){
	$('#login-btn').click(login);
	$('#login-form').submit(login);
});
function login() {
	var username = document.getElementById('username').value,
		password = document.getElementById('password').value,
		data = { username: username, password: password};

	$.ajax({
		url: '/login',
		method: 'POST',
		data: data,
		dataType: 'json',
		success: function(data, textStatus, jqXHR) {
			var id = getURLParameter('goto');
			if (id!=null)
				window.location='showgame?id='+id;
			else
				window.location = "/gamesList";
		},
		error: function(jqXHR, textStatus, errorThrown) {
			//console.log('ERROR: ', errorThrown);
			if (jqXHR.status == 403)
				alert("Attempts exceeded. Please log into JIRA and complete a captcha");
			else if (jqXHR.status == 401){
				shake();
			}
		}
	});
	return false;
}
var shakes = 0;
var amount =10;
var times = 7;
var startVal;
var duration = 50;
function shake(){
	var $login = $('.login');
	if (shakes == 0){
		startVal = $login.css('left');
		$login.animate({left: '-='+(amount/2)}, {duration : duration/2, complete: shake});
		shakes++;
	} else if (shakes <= times){
		$login.animate({left: ((shakes%2!=0)?'+':'-')+'='+amount}, {duration: duration, complete: shake});
		shakes++;
	} else {
		$login.animate({left : startVal}, duration/2);
		$('#password').focus().val('');
		shakes=0;//I give 0 shakes
	}
}
function getURLParameter( name ) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

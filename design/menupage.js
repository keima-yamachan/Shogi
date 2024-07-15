$(function(){
	$('.h-menu').hide();
	$('.menu').hide();

	$('.kata').click(function(){
		$(this).parent('.kata-group').toggleClass('open');
		$(this).next('.menu').slideToggle(250);
		$('.kata').not($(this)).next('.menu').slideUp();
		$('.kata').not($(this)).parent('.kata-group').removeClass('open');
	});

	$('.h-menu-list').click(function(){
		$(this).next('.h-menu').slideToggle(50);
	});
});
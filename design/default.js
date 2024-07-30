$(function(){
	$('.h-menu').hide();
	$('.h-menu-list').click(function(){
		$(this).next('.h-menu').slideToggle(50);
	});
});
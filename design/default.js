jQuery(function(){
	jQuery('.h-menu').hide();
	jQuery('.h-menu-list').click(function(){
		jQuery(this).next('.h-menu').slideToggle(50);
	});
});

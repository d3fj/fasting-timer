const Me = imports.misc.Mixin;

Me._initialize(function() {
  let _indicator = null;
  
  this.add_indicator = function(indicator, index) {
    const indicator_item_container = document.createElement('div');
    indicator_item_container.appendChild(indicator);
    
    const container = document.createElement('div');
    container.appendChild(indicator);
    // GNOME shell indicator logic here
  };
});

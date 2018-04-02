$( window ).on( "load", function() {
  
  var searchItemSelector = 'nav ul li > *:not(ul)';
  
  var setHighlight = function(str, targets){
    
    var $targets = (targets)? $(targets) : $(searchItemSelector);
    //sanitize removing everything except numbers and letters
    var _str = (str || '').replace(/[^a-zA-Z0-9]/g, '');
      

    $targets.each(function(index, el){
      
      var hasInnerLink = ($(el).has('a').length>0);
      var $text = (hasInnerLink)? $($(el).find('a')) : $(el);
      var text = $text.text().trim();
      var regex = new RegExp(_str, 'gi');
      var html = text.replace(regex, function(s) {
        return '<span class="hl">'+s+'</span>';
      });
      
      $text.html(html);
      
    });
  }
  
  var clearHighlight = function(targets){
    
    var $targets = (targets)? $(targets) : $('nav *:has(> .hl)');
    $targets.each(function(i,e){
      var hasInnerLink = ($(e).has('a').length>0);
      var $text = (hasInnerLink)? $($(e).find('a')) : $(e);
      $text.html($text.text());
    });
    
  }

  var updateResults = function(force){
    
    //get query value
    var query = $('nav .search-form .form-control').val().toLowerCase();
    
    //ignore if equals to cached
    var lastQuery = $('nav').data('last-search');

    //resolve for a valid search
    var isValidQuery = ( query && query.length && query!==lastQuery);
    
    
    if(isValidQuery || force){
      
      if(isValidQuery){
        
        //css flag as searching
        $('nav').addClass('--searching');
        
      }else{
        
        //css flag as searching
        $('nav').removeClass('--searching');
        
        //remove highlighting
        clearHighlight();
        
      }
      
      //remove css 'is-match' flags
      $('nav .--is-match').removeClass('--is-match');
      
      //get all items to search in
      var items = $(searchItemSelector);
      
      if(!query || query==='')
        items = [];
      
      //search loop
      for(var i=0, len=items.length; i<len; i++){
        
        var $item = $(items[i]);
        var text = $item.text().toLowerCase();
        var isMatch = (text.indexOf(query)>=0);
        
        if(isMatch){
          
          //css flag as match
          $item.parents('li').addClass('--is-match');
          $item.addClass('--is-match');
          
          setHighlight(query,$item);
          
        }
        else{
          
          $item.parent().removeClass('--is-match');
          $item.removeClass('--is-match');
          clearHighlight($item);
          
        }
        
      }
      
    }
    else{
      
      //remove css 'searching' flag
      $('nav').removeClass('--searching');
      
      //remove css 'is-match' flags
      $('nav .--is-match').removeClass('--is-match');
      
      //remove highlighting
      clearHighlight();
      
    }

    //update cached value
    $('nav').data('last-search',query);

    
  }
  
  var updateResultsDelayed = function(){
    setTimeout(function(){
      updateResults();
      clearHighlight();
    },50);
  }
  
  var restoreHighlights = function(){
    var query = $('nav').data('last-search');
    if(query && query.length)
      setHighlight(query);
  }
  

  $('body').on('input', '#NavSearchInput', updateResults);
  //$('body').on('blur', '#NavSearchInput', updateResultsDelayed);
  $('body').on('focus', '#NavSearchInput', restoreHighlights);
  $('body').on('submit', '.search-form', function(e){return false});
  
  
  $('body').on('keyup', function(evt){
    if(evt.keyCode==83)
      $('#NavSearchInput').focus();
  });
  
  
  
  
  /* STOP NAV OVER SCROLLING TO GET RPPAGATED TO BODY */
  
  $('nav').data('scrollTop',$('nav').scrollTop());
  $('window').on('scroll', function(e) {
    
    var st0 = $('nav').data('scrollTop');
    var st1 = $('nav').scrollTop();
    var delta = st1-st0;
    console.log(delta);
    
    if(delta<0 && $('nav').scrollTop() >= $('nav')[0].scrollHeight - $('nav').outerHeight() ) e.preventDefault();
    if(delta>0 && $('nav').scrollTop() <= 0 ) e.preventDefault();
    
    $('nav').data('scrollTop',$('nav').scrollTop());
  
  });

  /*
  $('nav').on('mousewheel', function(e) {
    
    var delta = e.originalEvent.wheelDelta;
    
    if(delta<0 && $('nav').scrollTop() >= $('nav')[0].scrollHeight - $('nav').outerHeight() ) e.preventDefault();
    if(delta>0 && $('nav').scrollTop() <= 0 ) e.preventDefault();
  
  });
  */
  
  
  
  var buildTOC = function(){
    
    
    var html = [];
    var headers = $('article').find('a#top,h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]');
    html.push('<div class="TOC"><ul>');
    for(var i=0; i<headers.length;i++){
      var $header = $(headers[i]);
      var id = $header.attr('id');
      var name = $header[0].nodeName;
      var text = $header.text();
      html.push('<li class="'+name+'"><a href="#'+id+'">'+text+'</a></li>');
    }
    html.push('</ul></div>');
    
    //$('body').append(html.join(''));
    $(html.join('')).insertBefore('article');
    
    
    var _headers = $('body.kind-tutorial article').find('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]');
    for(var j=0; j<_headers.length;j++){
      var $h = $(_headers[j]);
      $h.prepend('<a class="permalink" href="#'+ $h.attr('id') +'"></a>');
    }
  }
  
  buildTOC();

});
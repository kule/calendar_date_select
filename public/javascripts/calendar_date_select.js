// CalendarDateSelect - a small prototype based date picker
// Version 1.0
// Questions, comments, bugs? - email the Author - Tim Harper <"timseeharper@gmail.seeom".gsub("see", "c")> 
Element.addMethods({
  purgeChildren: function(element) {
    $A(element.childNodes).each(function(e){$(e).remove();});
  },
  build: function(element, type, options, style) {
    newElement = Element.build(type, options, style);
    element.appendChild(newElement);
    return newElement;
  }
});

Element.build = function(type, options, style)
{
  e = $(document.createElement(type));
  
  $H(options).each(function(pair) {
    eval("e." + pair.key + " = pair.value" );
  });
  
  if (style) $H(style).each(function(pair) {
    eval("e.style." + pair.key + " = pair.value" );
  });

  return e;
};
nil=null;

CalendarDateSelect = Class.create();
CalendarDateSelect.weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
CalendarDateSelect.months = $w("January February March April May June July August September October November December" );
CalendarDateSelect.same_month = function(a,b) { return ( (a.getMonth()==b.getMonth()) && (a.getFullYear()==b.getFullYear()) ) }
CalendarDateSelect.same_day = function(a,b) { return ( (a.getDate()==b.getDate()) && (a.getMonth()==b.getMonth()) && (a.getFullYear()==b.getFullYear()) ) }
CalendarDateSelect.padded2 = function(hour) { padded2 = hour.toString(); if (parseInt(hour) < 10) padded2="0" + padded2; return padded2; }
CalendarDateSelect.ampm = function(hour) { return (hour < 12) ? "AM" : "PM"; }
CalendarDateSelect.ampm_hour = function(hour) { return (hour == 0) ? 12 : (hour > 12 ? hour - 12 : hour ) }
CalendarDateSelect.date_string = function(date, time){
  if (! date) return ""; 
  str = "";
  str += CalendarDateSelect.months[date.getMonth()] + " ";
  str += date.getDate().toString() + ", ";
  str += date.getFullYear().toString();
  
  if (time)
  {
    str += " ";
    hour = date.getHours();
    
    str += CalendarDateSelect.ampm_hour(hour).toString() +
           ":" + CalendarDateSelect.padded2( date.getMinutes() ) + 
           " " + CalendarDateSelect.ampm(hour)
  }
  return str;
}

CalendarDateSelect.prototype = {
  initialize: function(target_element, options) {
    // initialize the date control
    this.options = $H({
      embedded: false,
      time: false,
      year_range: 10,
      calendar_div: nil,
      close_on_click: nil,
      minute_interval: 5
    }).merge(options || {});
    
    this.target_element = $(target_element); // make sure it's an element, not a string
    this.selection_made = $F(this.target_element)!="";
    
    if (this.target_element.calendar_date_select)
    {
      this.target_element.calendar_date_select.close();
      return false;
    }
    this.target_element.calendar_date_select = this;
    
    this.calendar_div = $(this.options['calendar_div']);
    if (!this.target_element) { alert("Target element " + target_element + " not found!"); return false;}
    
    this.parse_date();
    
    // by default, stick it by the target element (if embedded, that's where we'll want it to show up)
    if (this.calendar_div == nil) { this.calendar_div = $( this.options.embedded ? this.target_element.parentNode : document.body ).build('div'); }
    if (!this.options.embedded) {
      this.calendar_div.style.position = "absolute";
      pos = Position.cumulativeOffset(this.target_element);
      
      this.calendar_div.style.left = pos[0].toString() + "px";
      this.calendar_div.style.top = (pos[1] + this.target_element.getDimensions().height ).toString() + "px";
    }
    
    this.calendar_div.addClassName("calendar_date_select");
    
    if (this.options["embedded"]) this.options["close_on_click"]=false;
    // logic for close on click
    if (this.options['close_on_click']===nil )
    {
      if (this.options['time'])
        this.options["close_on_click"] = false;
      else
        this.options['close_on_click'] = true;
    }
    
    this.init_frame();
  },
  init_frame: function() {
    that=this;
    // create the divs
    $w("header body time buttons footer").each(function(name) {
      eval(name + "_div = that." + name + "_div = that.calendar_div.build('div', { className: '"+name+"' }, { clear: 'left'} ); ");
    });
    
    this.init_time_div();
    this.init_buttons_div();
    this.footer_div.update("&nbsp;");
    // make the header buttons
    this.prev_month_button = header_div.build("button", { innerHTML : "&lt;", type: "button"});
    this.month_select = header_div.build("select");
    this.year_select = header_div.build("select");
    this.next_month_button = header_div.build("button", { innerHTML : "&gt;", type: "button"});
    
    // make the month selector
    for(x=0; x<12; x++)
      this.month_select.options[x]=new Option(CalendarDateSelect.months[x],x);
    
    Event.observe(this.prev_month_button, 'click', (function () { this.nav_month(-1) }).bindAsEventListener(this));
    Event.observe(this.next_month_button, 'click', (function () { this.nav_month(1) }).bindAsEventListener(this));
    Event.observe(this.month_select, 'change', (function () { this.set_month($F(this.month_select)) }).bindAsEventListener(this));
    Event.observe(this.year_select, 'change', (function () { this.set_year($F(this.year_select)) }).bindAsEventListener(this));
    
    this.refresh();
  },
  init_buttons_div: function()
  {
    buttons_div = this.buttons_div;
    
    buttons_div.build("button", {
      innerHTML: (this.options["time"] ? "Now" : "Today" ),
      onclick: this.today.bindAsEventListener(this), 
      type: "button"
    });
    if (this.allow_close_buttons()) 
    {
      buttons_div.build("button", {
        innerHTML: "Ok",
        onclick: this.ok.bindAsEventListener(this),
        type: "button"
      });
      buttons_div.build("button", {
        innerHTML: "Cancel",
        onclick: this.close.bindAsEventListener(this), 
        type: "button"
      });
    }
  },
  init_time_div: function()
  {
    time_div = this.time_div;
    // make the time div
    if (this.options["time"])
    {
      time_div.build("span", {innerHTML:" @ "})
      this.hour_select = time_div.build("select", {
        calendar_date_select: this,
        onchange: function() { this.calendar_date_select.update_selected_date( { hour: this.value });}
      });
      time_div.build("span", {innerHTML:"&nbsp; : "});
      this.minute_select = time_div.build("select", {
        calendar_date_select: this,
        onchange: function() { this.calendar_date_select.update_selected_date( {minute: this.value }) }
      });
      
      // populate hours
      for(x=0;x<=23;x++) { this.hour_select.options[x] = new Option( CalendarDateSelect.ampm_hour(x).toString() + " " + CalendarDateSelect.ampm(x), x ) }
      // populate minutes
      x=0; for(m=0;m<=60;m+=this.options["minute_interval"]) { this.minute_select.options[x++] = new Option( CalendarDateSelect.padded2(m), m ) }
    } else (time_div.remove());
  },
  allow_close_buttons: function() { return ( !this.options["embedded"]); },
  nav_month: function(dir) {
    this.set_month(this.date.getMonth() + dir )
  },
  date_string: function() {
    return (this.selection_made) ? CalendarDateSelect.date_string(this.selectedDate, this.options['time']) : "&nbsp;";
  },
  set_month: function(month) {
    prev_day = this.date.getDate();
    // do it twice to force the month if the date is out of range
    this.date.setMonth(month);
    this.date.setMonth(month);
    
    if (this.date.getDate()!=prev_day ) this.date.setDate(28);
    
    this.refresh();
  },
  set_year: function(year) {
    this.date.setYear(year);
    this.refresh();
  },
  refresh: function ()
  {
    // set the month
    this.month_select.selectedIndex = this.date.getMonth();
    
    // set the year, 
    range=this.options["year_range"];
    this.year_select.purgeChildren();
    for( x=0; x<=range*2; x++)
    {
      year = x+(this.date.getFullYear() - range);
      this.year_select.options[x]=new Option(year,year);
    }
    this.year_select.selectedIndex=range;
    
    // make the calendar!!
    (body_div=this.body_div).purgeChildren();
    days_table = body_div.build("table", { cellPadding: "0px", cellSpacing: "0px", width: "100%" }).build("tbody");

    // make the weekdays!
    weekdays_row = days_table.build("tr", {className: "weekdays"});
    
    CalendarDateSelect.weekdays.each( function(weekday) { 
      weekdays_row.build("td", {innerHTML: weekday});
    });
    
    // Make the days!
    days_row = days_table.build("tr", {className: "days"});
    iterator = new Date(this.date);
    
    pre_days = iterator.getDay() // draw some days before the fact
    if (pre_days < 3) pre_days+=7;
    iterator.setDate(1 - pre_days);
    cells_to_render = 42;
    cell_index = 0;
    today = new Date();
    
    do {
      day = iterator.getDate();
      day_td = days_row.build("td", {
          innerHTML: day,
          day: day,
          month: iterator.getMonth(),
          year: iterator.getFullYear(),
          calendar_date_select: this,
          className: (CalendarDateSelect.same_day(iterator, today) ? "today " : "") + (iterator.getMonth() == this.date.getMonth() ? "" : "other") ,
          onmouseover: function () { this.calendar_date_select.day_hover(this); },
          onmouseout: function () { this.calendar_date_select.day_hover_out(this) },
          onclick: function() { this.calendar_date_select.update_selected_date(this); }
        },
        { cursor: "pointer" }
      );
      iterator.setDate( day + 1);
      cell_index++;
      if ( cell_index %7==0 ) days_row = days_table.build("tr", {className: "days"});
    } while ( cells_to_render > cell_index );
    
    // set the time
    if (this.options["time"]) {
      this.hour_select.selectedIndex = this.selectedDate.getHours();
      this.minute_select.selectedIndex = this.selectedDate.getMinutes() / this.options["minute_interval"];
      
      this.hour_select.onchange();
      this.minute_select.onchange();

    }
    
    this.set_selected_class();
    this.update_footer();
  },
  day_hover: function(element) {
    element.addClassName("hover");
    hover_date = new Date(this.selectedDate);
    hover_date.setYear(element.year); hover_date.setMonth(element.month); hover_date.setDate(element.day);
    this.footer_div.update(CalendarDateSelect.date_string(hover_date, this.options['time']));
  },
  day_hover_out: function(element) { element.removeClassName("hover"); this.update_footer();},
  update_footer: function() { this.footer_div.update(this.date_string()); },
  set_selected_class: function() {
    // clear selection
    this.body_div.getElementsBySelector(".selected").each(function(e) { e.removeClassName("selected")});
    
    if (!this.selection_made) return;
    
    day = this.selectedDate.getDate(); month = this.selectedDate.getMonth();
    this.body_div.getElementsBySelector("td").each(function(e) { if ((e.day == day) && (e.month == month)) {e.addClassName("selected")} } );
  },
  reparse: function() { this.parse_date(); this.refresh(); },
  parse_date: function()
  {
    // try a few things to get a valid date
    this.date = new Date(this.options['date'] || $F(this.target_element));
    if (isNaN(this.date.getDate())) this.date = new Date();
    this.selectedDate = new Date(this.date);    
  },
  update_selected_date:function(parts) {
    if (parts.day) {
      this.selectedDate.setDate(parts.day);
      this.selectedDate.setMonth(parts.month);
      this.selectedDate.setYear(parts.year); //this.date.getFullYear());
      this.selection_made = true;
    }
    
    if (parts.hour) this.selectedDate.setHours(parts.hour);
    if (parts.minute) this.selectedDate.setMinutes(parts.minute);
    
    if (this.options.embedded) { this.target_element.value = this.date_string(); }
    if (this.options.close_on_click) { this.ok(); }
    this.update_footer();
    this.set_selected_class();
  },
  ok: function() {
    this.target_element.value = this.date_string();
    if (this.options.onok) this.options.onok(this);
    this.close();
  },
  today: function() {
    this.selection_made=true;
    this.selectedDate = new Date();
    this.date = new Date();
    this.refresh();
  },
  close: function() {
    this.target_element.calendar_date_select = nil;
    this.calendar_div.remove();
  }
}
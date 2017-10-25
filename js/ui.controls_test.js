/**
ui.control.js
Created by Pitch Interactive
Created on 6/26/2012
This code will control the primary functions of the UI in the ArmsGlobe app
**/
var d3Graphs = {
    barGraphWidth: 300,
	barGraphHeight: 800,
    barWidth: 14,
	barGraphTopPadding: 20,
	barGraphBottomPadding: 50,
	histogramWidth: 780,
	histogramHeight: 140,
	histogramLeftPadding:31,
	histogramRightPadding: 31,
	histogramVertPadding:10,
	barGraphSVG: d3.select("body").append("svg"),
	histogramSVG: null,
	histogramYScale: null,
	histogramXScale: null,
	cumImportY: 0,cumExportY: 0,
    cumImportLblY: 0,cumExportLblY: 0,
    inited: false,
    histogramOpen: false,
    handleLeftOffset: 14,
    handleInterval: 40,
    windowResizeTimeout: -1,
    histogramAllocations: null,
    histogramInterferences: null,
    histogramAbsMax: 0,
    previousAllocationLabelTranslateY: -1,
    previousInterferenceLabelTranslateY: -1,
    setCountry: function(country) {
        $("#hudHeader .countryTextInput").val(country);
        d3Graphs.updateViz();
    },
    initGraphs: function() {
        this.showHud();
        this.drawBarGraph();
        this.drawHistogram();
    },
    showHud: function() {
        if(this.inited) return;
        this.inited = true;
        $("#hudHeader").show();
        d3Graphs.positionHistory();
        $("#history").show();
        $("#graphIcon").show();
        $("#allocationIntereferenceBtns").show();
        $("#graphIcon").click(d3Graphs.graphIconClick);
        $("#history .close").click(d3Graphs.closeHistogram);
        $("#history ul li").click(d3Graphs.clickTimeline);
        $("#handle").draggable({axis: 'x',containment: "parent",grid:[this.handleInterval, this.handleInterval], stop: d3Graphs.dropHandle, drag: d3Graphs.dragHandle });
        $("#hudHeader .searchBtn").click(d3Graphs.updateViz);
        $("#allocationIntereferenceBtns .imex>div").not(".label").click(d3Graphs.importExportBtnClick);
        $("#allocationInterferenceBtns .imex .label").click(d3Graphs.allocationInterferenceLabelClick);
        $("#hudHeader .countryTextInput").autocomplete({ source:selectableCountries });
        $("#hudHeader .countryTextInput").keyup(d3Graphs.countryKeyUp);
        $("#hudHeader .countryTextInput").focus(d3Graphs.countryFocus);
        $(document).on("click",".ui-autocomplete li",d3Graphs.menuItemClick);
        $(window).resize(d3Graphs.windowResizeCB);
        
    },
    dragHandle:function() {
        if(!d3Graphs.histogramOpen) {
            return;
        }
        d3Graphs.setHistogramData();
        d3Graphs.updateActiveYearDots();
    },
    clickTimeline:function() {
        var year = $(this).html();
        if(year < 10) {
            year = (year * 1) + 2000;
        }
        if(year < 100) {
            year = (year * 1) + 1900
        }
        var index = year - 1992;
        var leftPos = d3Graphs.handleLeftOffset + d3Graphs.handleInterval * index;
        $("#handle").css('left',leftPos+"px");
        d3Graphs.updateViz();
    },
    windowResizeCB:function() {
        clearTimeout(d3Graphs.windowResizeTimeout);
        d3Graphs.windowResizeTimeout = setTimeout(d3Graphs.positionHistory, 250);
    },
    positionHistory: function() {
        var graphIconPadding = 20;
        var historyWidth = $("#history").width();
        var totalWidth = historyWidth + $("#graphIcon").width() + graphIconPadding;
        var windowWidth = $(window).width();
        var historyLeftPos = (windowWidth - totalWidth) / 2.0;
        $("#history").css('left',historyLeftPos+"px");
        $("#graphIcon").css('left',historyLeftPos + historyWidth + graphIconPadding+'px');
    },
    countryFocus:function(event) {
        console.log("focus");
        setTimeout(function() { $('#hudHeader .countryTextInput').select() },50);
    },
    menuItemClick:function(event) {
        d3Graphs.updateViz();
    },
    countryKeyUp: function(event) {
        if(event.keyCode == 13 /*ENTER */) {
            d3Graphs.updateViz();
        }
    },
    
    updateViz:function() {
        var yearOffset = $("#handle").css('left');
        yearOffset = yearOffset.substr(0,yearOffset.length-2);
        yearOffset -= d3Graphs.handleLeftOffset;
        yearOffset /= d3Graphs.handleInterval;
        var year = yearOffset + 1992;
        
        var country = $("#hudHeader .countryTextInput").val().toUpperCase();
        if(typeof countryData[country] == 'undefined') {
            return;
        }
        //interference first
        var interferenceArray = []
        var interferenceBtns = $("#allocationInterferenceBtns .interference>div").not(".label");
        for(var i = 0; i < interferenceBtns.length; i++) {
            var btn = $(interferenceBtns[i]);
            var weaponTypeKey = btn.attr('class');
            if(btn.find('.inactive').length == 0) {
                interferenceArray.push(reverseWeaponLookup[weaponTypeKey]);
            }
        }
        //Allocation second
        var allocationArray = []
        var allocationBtns = $("#allocationInterferenceBtns .allocation>div").not(".label");
        for(var i = 0; i < allocationBtns.length; i++) {
            var btn = $(allocationBtns[i]);
            var weaponTypeKey = btn.attr('class');
            if(btn.find('.inactive').length == 0) {
                allocationArray.push(reverseWeaponLookup[weaponTypeKey]);
            }
        }
        selectVisualization(timeBins, year,[country],interferenceArray, allocationArray);
    },
    dropHandle:function() {
        d3Graphs.updateViz();
    },
    allocationInterferenceLabelClick: function() {
        var btns = $(this).prevAll();
        var numInactive = 0;
        for(var i = 0; i < btns.length; i++) {
            if($(btns[i]).find('.inactive').length > 0) {
                numInactive++;
            }
        }
        if(numInactive <= 1) {
            //add inactive
            $(btns).find('.check').addClass('inactive');
        } else {
            //remove inactive
            $(btns).find('.check').removeClass('inactive');
        }
        d3Graphs.updateViz();
    },
    allocationInterferenceBtnClick:function() { 
        var check = $(this).find('.check');
        if(check.hasClass('inactive')) {
            check.removeClass('inactive');
        } else {
            check.addClass('inactive');
        }
        d3Graphs.updateViz();
    },
    graphIconClick: function() {
        if(!d3Graphs.histogramOpen) {
            d3Graphs.histogramOpen = true;
            $("#history .graph").slideDown();
        } else {
            d3Graphs.closeHistogram();
        }
    },
    closeHistogram: function() {
        d3Graphs.histogramOpen = false;
        $("#history .graph").slideUp();
    },
    line: d3.svg.line()
        // assign the X function to plot our line as we wish
    .x(function(d,i) { 
        return d3Graphs.histogramXScale(i) + d3Graphs.histogramLeftPadding; 
     })
    .y(function(d) { 
        return d3Graphs.histogramYScale(d) + d3Graphs.histogramVertPadding; 
    }),
    setHistogramData:function() {
        var allocationArray = [0];
        var interferenceArray = [0];
        var historical = selectedCountry.summary.historical;
        var numHistory = historical.length;
        var absMax = 0;
        for(var i = 1; i < numHistory; i++) {
            var allocationPrev = historical[0].allocations;
            var allocationCur = historical[i].allocations;
            var allocationDiff = (allocationCur - allocationPrev) / allocationPrev * 100;
            var interferencePrev = historical[0].interferences;
            var interferenceCur = historical[i].interferences;
            var interferenceDiff = (interferenceCur - interferencePrev) / interferencePrev * 100;
            allocationArray.push(allocationDiff);
            interferenceArray.push(interferenceDiff); 
            if(Math.abs(allocationDiff) > absMax) {
                absMax = Math.abs(allocationDiff);
            }
            if(Math.abs(interferenceDiff) > absMax) {
                absMax = Math.abs(interferenceDiff);
            }
            
        }
        this.histogramAllocationArray = allocationArray;
        this.histogramInterferenceArray = interferenceArray;
        this.histogramAbsMax = absMax;
    },
    drawHistogram:function() {
        if(this.histogramSVG == null) {
            this.histogramSVG = d3.select('#history .container').append('svg');
            this.histogramSVG.attr('id','histogram').attr('width',this.histogramWidth).attr('height',this.histogramHeight);
        }
        this.setHistogramData();
        
        this.histogramYScale = d3.scale.linear().domain([this.histogramAbsMax,-this.histogramAbsMax]).range([0, this.histogramHeight - this.histogramVertPadding*2]);
        this.histogramXScale = d3.scale.linear().domain([0,this.histogramInterferenceArray.length-1]).range([0, this.histogramWidth - this.histogramLeftPadding - this.histogramRightPadding]);
        
        var tickData = this.histogramYScale.ticks(4);
        var containsZero = false;
        var numTicks = tickData.length;
        for(var i = 0; i < numTicks; i++) {
            if(tickData[i] == 0) {
                containsZero = true;
                break;
            }
        }
        if(!containsZero) {
            tickData.push(0);
        }
        //tick lines
        var ticks = this.histogramSVG.selectAll('line.tick').data(tickData);
        ticks.enter().append('svg:line').attr('class','tick');
        ticks.attr('y1',function(d) {
            return d3Graphs.histogramYScale(d) + d3Graphs.histogramVertPadding;
        }).attr('y2', function(d) {
            return d3Graphs.histogramYScale(d) + d3Graphs.histogramVertPadding;
        }).attr('x1',this.histogramLeftPadding).attr('x2',this.histogramWidth - this.histogramRightPadding)
        .attr('stroke-dasharray',function(d) {
            if(d == 0) {
              return null;
            }
            return '3,1';
        }).attr('stroke-width',function(d) {
            if(d == 0) {
                return 2;
            }
            return 1;
        });
        //tick labels
        var tickLabels = this.histogramSVG.selectAll("text.tickLblLeft").data(tickData);
        tickLabels.enter().append('svg:text').attr('class','tickLbl tickLblLeft').attr('text-anchor','end');
        tickLabels.attr('x', d3Graphs.histogramLeftPadding-3).attr('y',function(d) {
            return d3Graphs.histogramYScale(d) + d3Graphs.histogramVertPadding + 4;
        }).text(function(d) { return Math.abs(d); }).attr('display', function(d) {
            if(d == 0) { return 'none'; }
            return null;
        });
        var tickLabelsRight = this.histogramSVG.selectAll("text.tickLblRight").data(tickData);
        tickLabelsRight.enter().append('svg:text').attr('class','tickLbl tickLblRight');
        tickLabelsRight.attr('x', d3Graphs.histogramWidth - d3Graphs.histogramRightPadding+3).attr('y',function(d) {
            return d3Graphs.histogramYScale(d) + d3Graphs.histogramVertPadding + 4;
        }).text(function(d) { return Math.abs(d); }).attr('display', function(d) {
            if(d == 0) { return 'none'; }
            return null;
        });
        ticks.exit().remove();
        tickLabels.exit().remove();
        tickLabelsRight.exit().remove();
        //+ and -
        var plusMinus = this.histogramSVG.selectAll("text.plusMinus").data(["+","—","+","—"]); //those are &mdash;s
        plusMinus.enter().append('svg:text').attr('class','plusMinus').attr('text-anchor',function(d,i) {
            if(i < 2) return 'end';
            return null;
        }).attr('x',function(d,i) {
            var plusOffset = 3;
            if(i < 2) return d3Graphs.histogramLeftPadding + (d == '+' ? -plusOffset : 0) -2;
            return d3Graphs.histogramWidth - d3Graphs.histogramRightPadding + (d == '+' ? plusOffset : 0)+2;
        }).attr('y',function(d,i) {
            var yOffset = 10;
            return d3Graphs.histogramYScale(0) + d3Graphs.histogramVertPadding +  6 + (d == '+' ? -yOffset : yOffset); 
        }).text(String);
        //lines
        var allocationsVisible = $("#allocationInterferenceBtns .allocations .check").not(".inactive").length != 0;
        var interferencesVisible = $("#allocationInterferenceBtns .interferences .check").not(".inactive").length != 0;
        $("#history .labels .interferences").css('display', interferencesVisible ? 'block' : 'none');
        $("#history .labels .allocations").css('display', allocationsVisible ? 'block' : 'none');
        
    
        var allocationLine = this.histogramSVG.selectAll("path.allocation").data([1]);
        allocationLine.enter().append('svg:path').attr('class','allocation');
        allocationLine.attr('d',this.line(this.histogramAllocationArray)).attr('visibility',allocationsVisible ? 'visible' : 'hidden');
        var interferenceLine = this.histogramSVG.selectAll("path.interference").data([1]);
        interferenceLine.enter().append('svg:path').attr('class','interference');
        interferenceLine.attr('d',this.line(this.histogramInterferenceArray)).attr('visibility', interferencesVisible ? 'visible' : 'hidden');
        
        //active year labels
        var yearOffset = $("#handle").css('left');
        yearOffset = yearOffset.substr(0,yearOffset.length-2);
        yearOffset -= d3Graphs.handleLeftOffset;
        yearOffset /= d3Graphs.handleInterval;
        var maxVal = this.histogramAllocationArray[yearOffset] > this.histogramInterferenceArray[yearOffset] ? this.histogramAllocationArray[yearOffset] : this.histogramInterferenceArray[yearOffset];
        
        var activeYearData = [{x:yearOffset, y: this.histogramAllocationArray[yearOffset], max: maxVal}, {x: yearOffset, y: this.histogramInterferenceArray[yearOffset], max: maxVal}];
        var yearDots = this.histogramSVG.selectAll("ellipse.year").data(activeYearData);
        var yearDotLabels = this.histogramSVG.selectAll("text.yearLabel").data(activeYearData);
        yearDots.enter().append('ellipse').attr('class','year').attr('rx',4).attr('ry',4)
            .attr('cx',function(d) { return d3Graphs.histogramLeftPadding + d3Graphs.histogramXScale(d.x); })
            .attr('cy',function(d) { return d3Graphs.histogramVertPadding + d3Graphs.histogramYScale(d.y); });
        yearDotLabels.enter().append('text').attr('class','yearLabel').attr('text-anchor','middle');
        this.updateActiveYearDots();
    },
    updateActiveYearDots: function() {
        var yearOffset = $("#handle").css('left');
        yearOffset = yearOffset.substr(0,yearOffset.length-2);
        yearOffset -= d3Graphs.handleLeftOffset;
        yearOffset /= d3Graphs.handleInterval;
        var maxVal = this.histogramAllocationArray[yearOffset] > this.histogramInterferenceArray[yearOffset] ? this.histogramAllocationArray[yearOffset] : this.histogramInterferenceArray[yearOffset];
        var activeYearData = [{x:yearOffset, y: this.histogramAllocationArray[yearOffset], max: maxVal, type:"allocations"}, {x: yearOffset, y: this.histogramInterferenceArray[yearOffset], max: maxVal, type:"interferences"}];
        var yearDots = this.histogramSVG.selectAll("ellipse.year").data(activeYearData);
        var yearDotLabels = this.histogramSVG.selectAll("text.yearLabel").data(activeYearData);
        var allocationsVisible = $("#allocationInterferenceBtns .allocations .check").not(".inactive").length != 0;
        var interferencesVisible = $("#allocationInterferenceBtns .interferences .check").not(".inactive").length != 0;
        
        yearDots.attr('cx', function(d) { return d3Graphs.histogramLeftPadding + d3Graphs.histogramXScale(d.x); })
            .attr('cy',function(d) { return d3Graphs.histogramVertPadding + d3Graphs.histogramYScale(d.y); } )
            .attr('visibility', function(d) {
                if(d.type == "allocations") {
                    return allocationsVisible ? 'visible' : 'hidden';
                } else if(d.type == "interferences") {
                    return interferencesVisible ? 'visible' : 'hidden';
                }
            });
        yearDotLabels.attr('x',function(d) { return d3Graphs.histogramLeftPadding + d3Graphs.histogramXScale(d.x); })
        .attr('y',function(d) {
            var yVal = d3Graphs.histogramYScale(d.y) + d3Graphs.histogramVertPadding;
            if(d.y == maxVal) {
                yVal -= 7;  
            } else {
                yVal += 19;
            }
            if(yVal < d3Graphs.histogramVertPadding) {
                yVal += 26;
            }
            if(yVal > d3Graphs.histogramHeight + d3Graphs.histogramVertPadding) {
                yVal -= 26;
            }
            return yVal;
            
        }).text(function(d) {
            var numlbl = Math.round(d.y*10)/10;
            var lbl = "";
            if(d.y > 0) {
                lbl = "+";
            }
            lbl += ""+numlbl;
            return lbl;

        }).attr('visibility', function(d) {
            if(d.type == "allocations") {
                return allocationsVisible ? 'visible' : 'hidden';
            } else if(d.type == "interferences") {
                return interferencesVisible ? 'visible' : 'hidden';
            }
        });
    },
    drawBarGraph: function() {
        
        this.barGraphSVG.attr('id','barGraph').attr('width',d3Graphs.barGraphWidth).attr('height',d3Graphs.barGraphHeight);
        var allocationArray = [];
        var interferenceArray = [];
        var allocationTotal = selectedCountry.summary.allocation.total;
        var interferenceTotal = selectedCountry.summary.interference.total;
        for(var type in reverseWeaponLookup) {
            allocationArray.push({"type":type, "amount":selectedCountry.summary.allocation[type]});
            interferenceArray.push({"type":type, "amount":selectedCountry.summary.interference[type]});
        }
        var max = allocationTotal > interferenceTotal ? allocationTotal : interferenceTotal;
        var yScale = d3.scale.linear().domain([0,max]).range([0,this.barGraphHeight - this.barGraphBottomPadding - this.barGraphTopPadding]);
        var allocationRects = this.barGraphSVG.selectAll("rect.allocation").data(allocationArray);
        var midX = this.barGraphWidth / 2;
        this.cumAllocationY = this.cumInterferenceY = 0;
        allocationRects.enter().append('rect').attr('class', function(d) {
            return 'allocation '+d.type;
        }).attr('x',midX - this.barWidth).attr('width',this.barWidth);
        
        allocationRects.attr('y',function(d) {
            var value = d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - d3Graphs.cumAllocationY - yScale(d.amount) ;
            d3Graphs.cumAllocationY += yScale(d.amount);
            return value;
        }).attr('height',function(d) { return yScale(d.amount); });
        var interferenceRects = this.barGraphSVG.selectAll('rect.interference').data(exportArray);
        interferenceRects.enter().append('rect').attr('class',function(d) {
            return 'interference '+ d.type;
        }).attr('x',midX + 10).attr('width',this.barWidth);
        
        interferenceRects.attr('y',function(d) {
            var value = d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - d3Graphs.cumInterferenceY - yScale(d.amount);
            d3Graphs.cumInterferenceY += yScale(d.amount);
            return value;
        }).attr('height',function(d) { return yScale(d.amount); });
        //bar graph labels
        this.cumAllocationLblY = 0;
        this.cumInterferenceLblY = 0;
        var allocationLabels = this.barGraphSVG.selectAll("g.allocationLabel").data(allocationArray);
        allocationLabels.enter().append("g").attr('class',function(d) {
            return 'allocationLabel '+d.type;
        });
        this.previousAllocationLabelTranslateY = 0;
        this.previousInterferenceLabelTranslateY = 0;
        var paddingFromBottomOfGraph = 10;
        var heightPerLabel = 25;
        allocationLabels.attr('transform',function(d) { 
            var translate = 'translate('+(d3Graphs.barGraphWidth / 2 - 25)+",";
            var value = d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - d3Graphs.cumAllocationLblY - yScale(d.amount)/2;
            d3Graphs.cumImportLblY += yScale(d.amount);
            if(value > d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - paddingFromBottomOfGraph) {
                value -= paddingFromBottomOfGraph;
                d3Graphs.cumAllocationLblY += paddingFromBottomOfGraph;
            }/* else if(value >  d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - this.previousImportLabelTranslateY - heightPerLabel) {
                value -= heightPerLabel;
                d3Graphs.cumImportLblY += heightPerLabel;
            }*/
            translate += value+")";
            
            this.previousAllocationLabelTranslateY = value;
            return translate;
        }).attr('display',function(d) {
            if(d.amount == 0) { return 'none';}
            return null;
        });
        allocationLabels.selectAll("*").remove();
        allocationLabels.append('text').text(function(d) {
            return reverseWeaponLookup[d.type].split(' ')[0].toUpperCase();
        }).attr('text-anchor','end').attr('y',15).attr('class',function(d){ return 'allocation '+d.type});
        allocationLabels.append('text').text(function(d) {
            return abbreviateNumber(d.amount);
        }).attr('text-anchor','end');
        var interferenceLabels = this.barGraphSVG.selectAll("g.exportLabel").data(interferenceArray);
        interferenceLabels.enter().append("g").attr('class',function(d) {
            return 'interferenceLabel '+d.type;
        })
        interferenceLabels.attr('transform',function(d) { 
            var translate = 'translate('+(d3Graphs.barGraphWidth / 2 + 35)+",";
            var value = d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - d3Graphs.cumInterferenceLblY - yScale(d.amount)/2;
            d3Graphs.cumInterferenceLblY += yScale(d.amount);
            if(value > d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - paddingFromBottomOfGraph) {
                value -= paddingFromBottomOfGraph;
                d3Graphs.cumInterferenceLblY += paddingFromBottomOfGraph;
            }/* else if(value > d3Graphs.barGraphHeight - d3Graphs.barGraphBottomPadding - this.previousExportLabelTranslateY - heightPerLabel) {
                value -= heightPerLabel;
                d3Graphs.cumExportLblY += heightPerLabel;
            }*/
            translate += value+")";
            this.previousInterferenceLabelTranslateY = value;
            return translate;
        }).attr('display',function(d) {
            if(d.amount == 0) { return 'none';}
            return null;
        });
        interferenceLabels.selectAll("*").remove();
        interferenceLabels.append('text').text(function(d) {
            return reverseWeaponLookup[d.type].split(' ')[0].toUpperCase();
        }).attr('y',15).attr('class',function(d) { return 'interference '+ d.type});
        interferenceLabels.append('text').text(function(d) {
            return abbreviateNumber(d.amount);
        });
        
        var allocationTotalLabel = this.barGraphSVG.selectAll('text.totalLabel').data([1]);
        allocationTotalLabel.enter().append('text').attr('x',midX).attr('text-anchor','end')
            .attr('class','totalLabel').attr('y',this.barGraphHeight- this.barGraphBottomPadding + 25);
        
        allocationTotalLabel.text(abbreviateNumber(allocationTotal));
        
        var interferenceTotalLabel = this.barGraphSVG.selectAll('text.totalLabel.totalLabel2').data([1]);
        interferenceTotalLabel.enter().append('text').attr('x',midX+10).attr('class','totalLabel totalLabel2').attr('y', this.barGraphHeight - this.barGraphBottomPadding+25);
        interferenceTotalLabel.text(abbreviateNumber(interferenceTotal));
        
        //Allocation label at bottom
        var allocationLabel = this.barGraphSVG.selectAll('text.allocationLabel').data([1]).enter().append('text').attr('x',midX).attr('text-anchor','end').text('ALLOCATIONS')
            .attr('class','allocationLabel').attr('y', this.barGraphHeight - this.barGraphBottomPadding + 45);
        //Interference label at bottom
        var interferenceLabel = this.barGraphSVG.selectAll('text.interferenceLabel').data([1]).enter().append('text').attr('x',midX+10).text('INTERFERENCES')
            .attr('class','interferenceLabel').attr('y', this.barGraphHeight - this.barGraphBottomPadding + 45);
        
    },
    dragHandleStart: function(event) {
        console.log('start');
        event.dataTransfer.setData('text/uri-list','yearHandle.png');
        event.dataTransfer.setDragImage(document.getElementById('handle'),0,0);
        event.dataTransfer.effectAllowed='move';
    }
}

/*
This is going to be a number formatter. Example of use:

var bigNumber = 57028715;
var formated = abbreviateNumber(57028715);
return formated; //should show 57B for 57 Billion

*/
function abbreviateNumber(value) {
    
    var newValue = value;
    if (value >= 1000) {
        var suffixes = ["", "K", "M", "B","T"];
        var suffixNum = Math.floor( (""+value).length/3 );
        var shortValue = '';
        for (var precision = 3; precision >= 1; precision--) {
            shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
            var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
            if (dotLessShortValue.length <= 3) { break; }
        }
        if (shortValue % 1 != 0)  shortNum = shortValue.toFixed(1);
        newValue = shortValue+suffixes[suffixNum];
    }
    return '$' + newValue;
}


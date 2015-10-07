
// constructor
var SolrHeatmapLayer = function(map, solrBaseUrl, rptField)
{
    this.map = map;
    this.solrBaseUrl = solrBaseUrl;
    this.rptField = rptField;
};

// call after map pan/zoom to send a solr request and have response processed
SolrHeatmapLayer.prototype.fetch = function()
{
    //solrUrl = "http://localhost:8984/solr/jda/select?q=*:*";
    //solrUrl = "http://dev.jdarchive.org:8983/solr/jda/select?q=*:*";
    _this = this;
    jQuery.ajax({
	url: this.solrBaseUrl,
	dataType: 'JSONP',
	data: {
	    q: '*:*',
	    wt: 'json',
	    facet: true,
	    'facet.heatmap': this.rptField,
	    'facet.heatmap.distErrPct': 0.1,
	    'facet.heatmap.geom': this._mapViewToWkt(_this.map),
	    fq: this.rptField  + this._mapViewToEnvelope(_this.map),
	    fq: "Area:" + "[0 TO 10]"  // this needs to be an option
	},
	jsonp: 'json.wrf',
	success: function(solrResponse) {
	    _this.processSolrResult(solrResponse);
	}
    });
};

SolrHeatmapLayer.prototype. processSolrResult = function(data) 
{
    var facetHeatmap = this._solrResponseToObject(data);
    this.classifications = this.getClassifications(facetHeatmap);
    this.renderHeatmap(facetHeatmap, classifications);
},

SolrHeatmapLayer.prototype.renderHeatmap = function(facetHeatmap, classifications)
{
    _this = this;
    maxValue = classifications[classifications.length - 1] + .001;
    cellSize = this.getCellSize(facetHeatmap, this.map);
    var oldLayers = this.map.getLayersByName("Heatmap");
    if (oldLayers.length > 0)
    {
	jQuery.each(oldLayers, function(i, currentLayer){_this.map.removeLayer(currentLayer);});
    }
    var heatmapLayer = new Heatmap.Layer("Heatmap");
    var colorGradient = this.getColorGradient(this.getColors(), classifications);
    heatmapLayer.setGradientStops(colorGradient);

    var geodeticProjection = new OpenLayers.Projection("EPSG:4326");
    var latitudeStepSize = (facetHeatmap.maxY - facetHeatmap.minY) / facetHeatmap.rows
    var longitudeStepSize = (facetHeatmap.maxX - facetHeatmap.minX) / facetHeatmap.columns
    var countsArray = facetHeatmap.counts_ints2D;
    //testData = this.generateTestData(facetHeatmap.rows, facetHeatmap.columns, classifications);
    // iterate over cell values and create heatmap items
    jQuery.each(countsArray, function(rowNumber, currentRow){
	//jQuery.each(testData, function(rowNumber, currentRow){
	if (currentRow == null) return;
	jQuery.each(currentRow, function(columnNumber, value){
	    if (value == null || value <= 0) return;
	    var latitude = facetHeatmap.minY + ((facetHeatmap.rows - rowNumber- 1) * latitudeStepSize); 
	    var longitude = facetHeatmap.minX + (columnNumber * longitudeStepSize);
	    var geodetic = new OpenLayers.LonLat(longitude, latitude); 
	    var transformed = geodetic.transform(geodeticProjection, _this.map.getProjectionObject());
	    heatmapLayer.addSource(new Heatmap.Source(transformed, cellSize, Math.min(1., value / maxValue)));
	}
		   )});
    heatmapLayer.setOpacity(0.50);
    this.map.addLayer(heatmapLayer);
};
		    
// returns the count of how many values are in each classifications
// it is useful for test purposes to see how the values are distributed
SolrHeatmapLayer.prototype.getClassificationCounts = function()
{
    var counts = [];
    var classifications = this.classifications;
    jQuery.each(classifications, function(index, value){
	counts[index] = 0;
    });
    var array = facetHeatmap.counts_ints2D;
    jQuery.each(array, function(rowNumber, currentRow){
	if (currentRow == null) return;
	jQuery.each(currentRow, function(columnNumber, value){
	    for (i = 0 ; i < classifications.length ; i++)
	    {
		if (value <= classifications[i])
		{
		    counts[i]++;
		    return;
		}
	    }
	})});
    return counts;
};

// create vertial bars of colors on screen for test purposes
// typically called after regular Solr request has completed, just change count arrays
SolrHeatmapLayer.prototype.generateTestData = function(numberOfRows, numberOfColumns, classifications)
{
    var returnArray = [];
    var numberOfBars = classifications.length;
    var barSize = Math.floor(numberOfColumns / numberOfBars);
    for (var i = 0 ; i < numberOfRows ; i++)
    {
	returnArray[i] = [];
	for (var j = 0 ; j < numberOfColumns ; j++)
	{
	    index = Math.floor(j / barSize);
	    returnArray[i][j] = classifications[index];
	}
    }
    return returnArray;
};
		    
// use Jenks classification
SolrHeatmapLayer.prototype.getClassifications = function(facetHeatmap)
{
    var flatArray = [];
    for (var i = 0; i < facetHeatmap.counts_ints2D.length; i++) 
    {
	if (facetHeatmap.counts_ints2D[i] != null)  // entire row can be null
	    for (var j = 0 ; j < facetHeatmap.counts_ints2D[i].length ; j++)
		if (facetHeatmap.counts_ints2D[i][j] != null)
		    flatArray = flatArray.concat(facetHeatmap.counts_ints2D[i][j]);
    };
    series = new geostats(flatArray);
    numberOfClassifications = this.getColors().length
    classifications = series.getClassJenks(numberOfClassifications);
    // probably should check for multiple 0 in array
    return classifications;
};

// return heatmap cell size in pixels
SolrHeatmapLayer.prototype.getCellSize = function(facetHeatmap, map)
{
    var mapSize = map.getSize();
    var widthInPixels = mapSize.w;
    var heightInPixels = mapSize.h;
    var heatmapRows = facetHeatmap.rows;
    var heatmapColumns = facetHeatmap.columns;
    var sizeX = widthInPixels / heatmapColumns;
    var sizeY = heightInPixels / heatmapRows;
    var size = Math.max(sizeX, sizeY);
    return size; 
};

SolrHeatmapLayer.prototype.getColors = function()
{
    var colors = [0x000000, 0xffffb2ff, 0xfed976ff, 0xfeb24cff, 0xfd8d3cff, 0xf03b20ff, 0xbd0026ff];   // brewer
    //var colors = [0x00000000, 0x0000dfff, 0x00effeff, 0x00ff42ff, 0xfeec30ff, 0xff5f00ff, 0xff0000ff]; 
    return colors;
};

// OpenLayers gradient is hash of values and colors
SolrHeatmapLayer.prototype.getColorGradient = function(colors, classifications)
{
    var colorGradient = {};
    var maxValue = classifications[classifications.length - 1];
    for (var i = 0 ; i < classifications.length ; i++)
    {
	var value = classifications[i];
	var scaledValue = value / maxValue;
	if (scaledValue < 0)
	    scaledValue = 0;
	colorGradient[scaledValue] = colors[i];
    }
    return colorGradient;
};

// Solr response contains an array of name/value pairs, convert to hash
SolrHeatmapLayer.prototype._solrResponseToObject = function(data)
{
    var heatmap = {};
    var heatmapArray = data.facet_counts.facet_heatmaps[this.rptField];
    jQuery.each(heatmapArray, function(index, value) {
	if ((index % 2) == 0) {
	    heatmap[heatmapArray[index]] = heatmapArray[index + 1];
	}});
    return heatmap;
};

SolrHeatmapLayer.prototype._mapViewToEnvelope = function(map)
{
    var extent = map.getExtent();
    var lowerLeft = new OpenLayers.LonLat(extent.left, extent.bottom);
    var upperRight = new OpenLayers.LonLat(extent.right, extent.top);
    var geodeticProjection = new OpenLayers.Projection("EPSG:4326");
    var lowerLeftGeodetic = lowerLeft.transform(map.getProjectionObject(), geodeticProjection);
    var upperRightGeodetic = upperRight.transform(map.getProjectionObject(), geodeticProjection);
    var envelope = ':"Intersects(ENVELOPE(' + lowerLeftGeodetic.lon + ', ' + upperRightGeodetic.lon + ', ' + upperRightGeodetic.lat + ', ' + lowerLeftGeodetic.lat + '))"';
    return envelope;
};

SolrHeatmapLayer.prototype._mapViewToWkt = function(map)
{
    var extent = map.getExtent();
    var lowerLeft = new OpenLayers.LonLat(extent.left, extent.bottom);
    var upperRight = new OpenLayers.LonLat(extent.right, extent.top);
    var geodeticProjection = new OpenLayers.Projection("EPSG:4326");
    var lowerLeftGeodetic = lowerLeft.transform(map.getProjectionObject(), geodeticProjection);
    var upperRightGeodetic = upperRight.transform(map.getProjectionObject(), geodeticProjection);
    var wkt = '["' + lowerLeftGeodetic.lon + ' ' + lowerLeftGeodetic.lat + '" TO "' + upperRightGeodetic.lon + ' ' + upperRightGeodetic.lat + '"]';
    return wkt;
};

// for test purposes, just put a heatmap dot on the map
SolrHeatmapLayer.prototype.showHeatmapTest = function(data)
{
    heatmapLayer = new Heatmap.Layer("Heatmap");
    
    geodetic = new OpenLayers.LonLat(139.5, 35.5);  // Tokyo test point
    geodeticProjection = new OpenLayers.Projection("EPSG:4326");
    transformed = geodetic.transform(geodeticProjection, this.map.getProjectionObject());
    heatmapLayer.addSource(new Heatmap.Source(transformed, 200, .9));
    heatmapLayer.setOpacity(0.50);
    this.map.addLayer(heatmapLayer);
    console.log("added heatmap layer");
    return heatmapLayer;
};

 

# SolrHeatmapLayer
A javascript library that display Solr heatmaps on a web map

Converting the Solr response to a map layer is straigntforward.  The
heatmap works better if the count data is binned into classifications.
At least two independent groups have used Jenks classifications and
used computed them with the geostats JavaScript library.  From
Wikipedia:
The Jenks optimization method, also called the Jenks natural breaks
classification method, is a data clustering method designed to
determine the best arrangement of values into different classes. This
is done by seeking to minimize each class’s average deviation from the
class mean, while maximizing each class’s deviation from the means of
the other groups. In other words, the method seeks to reduce the
variance within classes and maximize the variance between classes. 

The number of clusters is may be based on what looks best with your
data or, more simply, the number of colors in the color map you want
to use.

Once clustered, the counts can be rendered on a map.  This library
uses OpenLayers 2.x as well as the HeatmapLayer library from Bjoern
Hoehrmann.  Essentially, each non-zero count is used to create a
HeatmapSource and added to the HeatmapLayer.  The size of the
HeatmapSource object in pixels is based on the grid size of the Solr
data and the number of pixels on the map.

This code includes a quick and dirty area based filter query.  Layers
that cover a large area tend to create a lot of background noise for
the heatmap.  I expected this would all come out in the wash during
classification, but it doesn't.  A reasonable area filter might
eliminate layers that are larger than 25% of the area of the
map.  

This library borrowed ideas from Jack Reed's very nice library for Solr
heatmaps with Leaflet.

You can see a version of this code running at
http://www.WorldWideGeoWeb.com.  While that version works, this
version hasn't even been tested.  It will within a week or two.

This library will evolve to support both Leaflet and OpenLayers,
perhaps in a Backbone framework.  Suggestions and questions are most
welcome, I'm SpacemanSteve@gmail.com.

This can be run on localhost using node server.js and going to
http://localhost:8088/example.html.  


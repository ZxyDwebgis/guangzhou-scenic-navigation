// --- 1. 初始化地图 ---
var map = new BMapGL.Map("allmap");
var point = new BMapGL.Point(113.273, 23.136); // 广州中心
map.centerAndZoom(point, 12);
map.enableScrollWheelZoom(true); // 开启滚轮缩放

// --- 2. 全局变量 ---
var myLocationPoint = null;
var locationMarker = null;
var trackPath = [];
var isTracking = false;
var trackPolyline = null;
var customMarkers = [];
var favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
var routeSearcher = null;
var routeMarkers = [];
var routePolyline = null;
var nearbyMarkers = [];// 用于存储周边搜索结果标记的数组
var trafficLayer = null; // 实时路况图层
var isTrafficOn = false; // 路况是否开启

// --- 4. 基础地图功能 ---
// 显示加载提示
function showLoading() {
    var loadingDiv = document.getElementById("loading");
    loadingDiv.style.display = "block";
}

function hideLoading() {
    var loadingDiv = document.getElementById("loading");
    loadingDiv.style.display = "none";
}

// --- 4. 基础地图功能 ---
// 初始化后加载所有景点
window.onload = function() {
    // 等待地图加载完成
    setTimeout(function() {
        loadAllScenicSpots();
    }, 1000);
};

// --- 5. 实用功能 ---
// 加载广州景点点位
function loadAllScenicSpots() {
    showLoading();
    
    // 使用百度地图API获取广州景点数据
    var localSearch = new BMapGL.LocalSearch(map, {
        renderOptions: {
            map: map,
            autoViewport: true
        },
        onSearchComplete: function(results) {
            hideLoading();
            
            if (results && results.getCurrentNumPois && results.getCurrentNumPois() > 0) {
                var pois = results.getPois ? results.getPois() : [];
                
                // 计算实际加载的景点数量
                var actualLoadedCount = 0;
                
                // 清除之前的景点标记
                clearScenicMarkers();
                
                // 添加新的景点标记
                for (var i = 0; i < pois.length && i < 50; i++) {
                    var poi = pois[i];
                    if (!poi.point) continue; // 确保有坐标
                    
                    var pt = new BMapGL.Point(poi.point.lng, poi.point.lat);
                    
                    // 创建标记
                    var marker = new BMapGL.Marker(pt);
                    marker.setIcon(createCustomMarkerIcon('#e74c3c'));
                    map.addOverlay(marker);
                    
                    // 保存景点信息
                    var spotInfo = {
                        name: poi.title || poi.name,
                        address: poi.address,
                        phone: poi.phone,
                        url: poi.url
                    };
                    
                    marker.spotInfo = spotInfo;
                    
                    // 创建信息窗口
                    var content = `
                        <div style="font-size:14px;">
                            <h4 style='margin:0 0 8px 0; color: #2c3e50;'>${poi.title || poi.name}</h4>
                            <p><b>地址：</b>${poi.address || '暂无地址信息'}</p>
                            <p><b>电话：</b>${poi.phone || '暂无'}</p>
                            <p><b>网址：</b>${poi.url || '暂无'}</p>
                            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                                <button onclick="setDest('${poi.title || poi.name}', ${poi.point.lng}, ${poi.point.lat})" style="margin-top:5px;width:100%; padding: 8px;">📍 去这里</button>
                                <button onclick="addToFavorites('${poi.title || poi.name}', ${poi.point.lng}, ${poi.point.lat})" style="margin-top:5px;width:100%;background-color: #f39c12; color: #fff; padding: 8px;">⭐ 收藏</button>
                            </div>
                        </div>
                    `;
                    
                    var infoWindow = new BMapGL.InfoWindow(content, {width: 280, height: 320});
                    
                    marker.addEventListener("click", function() {
                        map.openInfoWindow(infoWindow, pt);
                        document.getElementById("info-panel").innerHTML = `<p>已选中：<b>${poi.title || poi.name}</b></p>`;
                    });
                    
                    actualLoadedCount++; // 增加实际加载计数
                }
                
                // 更新信息面板 - 使用实际加载的数量
                document.getElementById("info-panel").innerHTML = 
                    `<p>✅ 已加载广州景点</p>`;
            } else {
                // 如果直接搜索景点失败，尝试搜索"旅游景点"
                var fallbackSearch = new BMapGL.LocalSearch(map, {
                    renderOptions: {
                        map: map,
                        autoViewport: true
                    },
                    onSearchComplete: function(results) {
                        hideLoading();
                        
                        if (results && results.getCurrentNumPois && results.getCurrentNumPois() > 0) {
                            var pois = results.getPois ? results.getPois() : [];
                            
                            // 清除之前的景点标记
                            clearScenicMarkers();
                            
                            // 添加新的景点标记
                            for (var i = 0; i < pois.length && i < 50; i++) {
                                var poi = pois[i];
                                if (!poi.point) continue; // 确保有坐标
                                
                                var pt = new BMapGL.Point(poi.point.lng, poi.point.lat);
                                
                                // 创建标记
                                var marker = new BMapGL.Marker(pt);
                                marker.setIcon(createCustomMarkerIcon('#e74c3c'));
                                map.addOverlay(marker);
                                
                                // 保存景点信息
                                var spotInfo = {
                                    name: poi.title || poi.name,
                                    address: poi.address,
                                    phone: poi.phone,
                                    url: poi.url
                                };
                                
                                marker.spotInfo = spotInfo;
                                
                                // 创建信息窗口
                                var content = `
                                    <div style="font-size:14px;">
                                        <h4 style='margin:0 0 8px 0; color: #2c3e50;'>${poi.title || poi.name}</h4>
                                        <p><b>地址：</b>${poi.address || '暂无地址信息'}</p>
                                        <p><b>电话：</b>${poi.phone || '暂无'}</p>
                                        <p><b>网址：</b>${poi.url || '暂无'}</p>
                                        <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                                            <button onclick="setDest('${poi.title || poi.name}', ${poi.point.lng}, ${poi.point.lat})" style="margin-top:5px;width:100%; padding: 8px;">📍 去这里</button>
                                            <button onclick="addToFavorites('${poi.title || poi.name}', ${poi.point.lng}, ${poi.point.lat})" style="margin-top:5px;width:100%;background-color: #f39c12; color: #fff; padding: 8px;">⭐ 收藏</button>
                                        </div>
                                    </div>
                                `;
                                
                                var infoWindow = new BMapGL.InfoWindow(content, {width: 280, height: 320});
                                
                                marker.addEventListener("click", function() {
                                    map.openInfoWindow(infoWindow, pt);
                                    document.getElementById("info-panel").innerHTML = `<p>已选中：<b>${poi.title || poi.name}</b></p>`;
                                });
                            }
                            
                            // 更新信息面板
                            document.getElementById("info-panel").innerHTML = 
                                `<p>✅ 已加载广州景点</p>`;
                        } else {
                            alert("❌ 加载景点失败: " + (results && this.getStatus() !== BMAP_STATUS_SUCCESS ? this.getStatus() : "未获取到结果"));
                        }
                    }
                });
                
                fallbackSearch.search("旅游景点", {page: 1, pageSize: 50});
            }
        }
    });
    
    // 搜索广州景点
    localSearch.search("旅游景点", {page: 1, pageSize: 50});
} 

// 清除景点标记
function clearScenicMarkers() {
    // 获取所有覆盖物
    var overlays = map.getOverlays();
    
    // 遍历并移除景点标记
    for (var i = overlays.length - 1; i >= 0; i--) {
        var overlay = overlays[i];
        if (overlay instanceof BMapGL.Marker && overlay.spotInfo) {
            map.removeOverlay(overlay);
        }
    }
}

// 定位功能
function locateMe() {
    var locateBtn = document.getElementById("locate-btn");
    locateBtn.innerHTML = "📍 定位中...";
    locateBtn.disabled = true;
    
    // 显示加载提示
    document.getElementById("info-panel").innerHTML = 
        "<p>正在获取您的位置...</p>";
    
    // 添加一个定位状态标志
    let locationSuccess = false;
    
    // 存储超时定时器ID以便清除
    let locationTimeout = null;
    
    // 方法1：直接使用百度地图的定位服务
    var geolocation = new BMapGL.Geolocation();
    
    geolocation.getCurrentPosition(
        function(r) {
            // 清除超时定时器
            if (locationTimeout) {
                clearTimeout(locationTimeout);
                locationTimeout = null;
            }
            
            // 如果已经通过其他方式处理过了，直接返回
            if (locationSuccess) return;
            locationSuccess = true;
            
            try {
                if (this.getStatus() === BMAP_STATUS_SUCCESS) {
                    // 成功获取位置
                    myLocationPoint = r.point;
                    
                    // 创建或更新定位标记
                    updateLocationMarker();
                    
                    // 更新信息面板
                    document.getElementById("info-panel").innerHTML = 
                        `<div style="padding: 10px; background: #e8f4fd; border-radius: 6px;">
                            <p style="margin: 0; font-weight: bold;">✅ 定位成功！</p>
                            <p style="margin: 5px 0;">📍 您的位置：${r.address.province}${r.address.city}${r.address.district}${r.address.street}${r.address.streetNumber || ''}</p>
                            <p style="margin: 0; color: #666;">经度: ${myLocationPoint.lng.toFixed(6)}<br>
                            纬度: ${myLocationPoint.lat.toFixed(6)}</p>
                        </div>`;
                    
                    // 在地图上显示
                    map.centerAndZoom(myLocationPoint, 16);
                    
                    // 查找附近景点（如果函数存在）
                    if (typeof findNearbyAttractions === 'function') {
                        setTimeout(findNearbyAttractions, 500);
                    } else {
                        console.warn('findNearbyAttractions函数未定义');
                    }
                    
                } else {
                    // 百度定位失败，尝试备用方案
                    tryBackupLocation();
                }
            } catch (error) {
                console.error('定位成功回调中发生错误：', error);
                // 即使有错误，也恢复按钮状态
            }
            
            // 恢复按钮状态
            locateBtn.innerHTML = "📍 定位我";
            locateBtn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        }
    );
    function findNearbyAttractions() {
        // 暂时为空，或者实现查找附近景点的功能
        console.log('查找附近景点函数被调用');
    }
    
    // 设置一个总的超时时间
    locationTimeout = setTimeout(function() {
        if (!locationSuccess) {
            locateBtn.innerHTML = "📍 定位我";
            locateBtn.disabled = false;
            document.getElementById("info-panel").innerHTML = 
                "<p style='color: #e74c3c;'>❌ 定位超时，请检查网络和定位权限</p>";
        }
        locationTimeout = null;
    }, 20000);
}

// 备用定位方案
function tryBackupLocation() {
    document.getElementById("info-panel").innerHTML = 
        "<p>尝试备用定位方案...</p>";
    
    // 方法1：使用IP定位获取城市级别位置
    var myCity = new BMapGL.LocalCity();
    myCity.get(function(result) {
        if (result && result.center) {
            myLocationPoint = result.center;
            
            // 使用城市中心作为近似位置
            updateLocationMarker();
            
            document.getElementById("info-panel").innerHTML = 
                `<div style="padding: 10px; background: #fff3cd; border-radius: 6px;">
                    <p style="margin: 0; font-weight: bold;">⚠️ 定位受限</p>
                    <p style="margin: 5px 0;">已定位到城市：${result.name}</p>
                    <p style="margin: 0; color: #666;">已跳转到${result.name}中心区域</p>
                </div>`;
            
            map.centerAndZoom(myLocationPoint, 13);
        } else {
            // 如果所有方法都失败，使用默认位置
            useDefaultLocation();
        }
    });
}
// 更新位置标记
function updateLocationMarker() {
    // 清除旧标记
    if (locationMarker) {
        map.removeOverlay(locationMarker);
    }
    
    // 创建新标记
    locationMarker = new BMapGL.Marker(myLocationPoint, {
        icon: createCustomMarkerIcon('#3498db', '📍')
    });
    
    map.addOverlay(locationMarker);
    
    // 添加定位圆圈（可选）
    addLocationCircle();
}

// 创建更好的标记图标
function createCustomMarkerIcon(color, emoji = '📍') {
    // 创建一个带emoji的SVG图标
    var size = 40;
    var svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="${color}" opacity="0.8"/>
            <circle cx="50" cy="50" r="35" fill="white" opacity="0.9"/>
            <text x="50" y="65" font-size="30" text-anchor="middle" fill="${color}">${emoji}</text>
        </svg>
    `;

    // 将SVG转换为data URL
    var svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

    return new BMapGL.Icon(svgUrl, new BMapGL.Size(size, size), {
        anchor: new BMapGL.Size(size/2, size/2)
    });
}

// 添加定位圆圈
function addLocationCircle() {
    // 清除旧的圆圈
    var overlays = map.getOverlays();
    for (var i = overlays.length - 1; i >= 0; i--) {
        if (overlays[i] instanceof BMapGL.Circle && overlays[i].isLocationCircle) {
            map.removeOverlay(overlays[i]);
        }
    }

    // 创建新的圆圈
    var circle = new BMapGL.Circle(myLocationPoint, 100, {
        strokeColor: "#3498db",
        strokeWeight: 2,
        strokeOpacity: 0.5,
        fillColor: "#3498db",
        fillOpacity: 0.1
    });
    circle.isLocationCircle = true; // 标记为定位圆圈

    map.addOverlay(circle);
}

// --- 5. 实用功能 ---
// 添加标记功能
var tempClickPoint = null;

function openAddMarkerModal() {
    alert("请先在地图上点击您想标记的位置");
    map.addEventListener("click", mapClickHandler);
}

function mapClickHandler(e) {
    tempClickPoint = e.latlng;
    document.getElementById("addMarkerModal").style.display = "block";
    map.removeEventListener("click", mapClickHandler);
}

function closeAddMarkerModal() {
    document.getElementById("addMarkerModal").style.display = "none";
}

function confirmAddMarker() {
    var title = document.getElementById("newTitle").value;
    var desc = document.getElementById("newDesc").value;
    var feature = document.getElementById("newFeature").value;
    var photo = document.getElementById("newPhoto").value || "https://via.placeholder.com/150";

    if (title && tempClickPoint) {
        var marker = new BMapGL.Marker(tempClickPoint);
        marker.setIcon(createCustomMarkerIcon('#9b59b6'));
        map.addOverlay(marker);
        
        // 保存自定义标记信息
        var customSpot = {
            name: title,
            lng: tempClickPoint.lng,
            lat: tempClickPoint.lat,
            desc: desc,
            feature: feature,
            photo: photo
        };
        
        marker.spotInfo = customSpot;
        customMarkers.push(marker);
        
        var content = `
            <div style="font-size:14px;">
                <h4 style='margin:0 0 8px 0; color: #2c3e50;'>${title}</h4>
                <p><b>简介：</b>${desc}</p>
                <p><b>特点：</b>${feature}</p>
                <img src="${photo}" style="width: 100%; height: auto; margin: 10px 0; border-radius: 5px;">
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                    <button onclick="setDest('${title}', ${tempClickPoint.lng}, ${tempClickPoint.lat})" style="margin-top:5px;width:100%; padding: 8px;">📍 去这里</button>
                    <button onclick="addToFavorites('${title}', ${tempClickPoint.lng}, ${tempClickPoint.lat})" style="margin-top:5px;width:100%;background-color: #f39c12; color: #fff; padding: 8px;">⭐ 收藏</button>
                    <button onclick="removeCustomMarker(this)" style="margin-top:5px;width:100%;background-color: #e74c3c; color: #fff; padding: 8px;">🗑️ 删除</button>
                </div>
            </div>
        `;
        
        var infoWindow = new BMapGL.InfoWindow(content, {width: 280, height: 320});
        
        marker.addEventListener("click", function(){
            map.openInfoWindow(infoWindow, tempClickPoint);
        });
        
        closeAddMarkerModal();
        alert(`✅ 已成功添加标记: ${title}`);
    } else {
        alert("❌ 请输入名称");
    }
}

function removeCustomMarker(btn) {
    var marker = null;
    
    // 查找对应的标记
    for(var i = 0; i < customMarkers.length; i++) {
        if(customMarkers[i].spotInfo) {
            var spot = customMarkers[i].spotInfo;
            if(btn.closest('.BMap_bubble_content').innerHTML.includes(spot.name)) {
                marker = customMarkers[i];
                break;
            }
        }
    }
    
    if(marker) {
        map.removeOverlay(marker);
        customMarkers.splice(customMarkers.indexOf(marker), 1);
        map.closeInfoWindow();
        document.getElementById("info-panel").innerHTML = `<p>✅ 已删除标记</p>`;
    }
}

// 记录路径功能
var trackStartTime = null;

function toggleTrack() {
    var trackBtn = document.getElementById("track-btn");
    var btnText = document.getElementById("trackBtnText");
    
    isTracking = !isTracking;
    
    if (isTracking) {
        if (!myLocationPoint) {
            alert("请先定位到您的位置");
            isTracking = false;
            return;
        }
        
        btnText.innerText = "停止记录";
        trackBtn.style.backgroundColor = "#e74c3c";
        trackPath = [];
        trackPath.push(myLocationPoint);
        
        // 记录开始时间
        trackStartTime = new Date();
        
        alert("✅ 开始记录路径，请移动位置（电脑端通过点击地图模拟移动）");
        map.addEventListener("click", recordStep);
        
    } else {
        btnText.innerText = "开始记录";
        trackBtn.style.backgroundColor = "#3498db";
        map.removeEventListener("click", recordStep);
        
        // 计算总距离和时间
        var totalDistance = calculateTotalDistance(trackPath);
        var endTime = new Date();
        var duration = (endTime - trackStartTime) / 1000; // 秒
        
        var hours = Math.floor(duration / 3600);
        var minutes = Math.floor((duration % 3600) / 60);
        var seconds = Math.floor(duration % 60);
        
        // 显示结果
        var resultText = `✅ 路径记录结束\n📏 总距离：${totalDistance.toFixed(2)} km\n⏱️ 用时：${hours}小时 ${minutes}分钟 ${seconds}秒`;
        alert(resultText);
        
        // 更新信息面板
        document.getElementById("info-panel").innerHTML = 
            `<p>✅ 记录结束：${totalDistance.toFixed(2)} km，用时 ${hours}小时 ${minutes}分钟 ${seconds}秒</p>`;
    }
}

// 修改记录步骤函数
function recordStep(e) {
    if (!isTracking) return;
    
    // 添加新的点位
    trackPath.push(e.latlng);
    
    // 创建路径线
    if (trackPolyline) map.removeOverlay(trackPolyline);
    trackPolyline = new BMapGL.Polyline(trackPath, {
        strokeColor: "#3498db",
        strokeWeight: 6,
        strokeOpacity: 0.5
    });
    map.addOverlay(trackPolyline);
}

// 天气功能
function showWeather() {
    if (!myLocationPoint) {
        alert("请先定位");
        return;
    }
    
    var location = `${myLocationPoint.lat},${myLocationPoint.lng}`;
    showLoading();
    
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${location.split(',')[0]}&lon=${location.split(',')[1]}&appid=531f663e01180bab846667a77b928b1e&units=metric&lang=zh_cn`)
        .then(response => response.json())
        .then(data => {
            var locationName = data.name || "广州市";
            
            var forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.split(',')[0]}&lon=${location.split(',')[1]}&appid=531f663e01180bab846667a77b928b1e&units=metric&lang=zh_cn`;
            
            fetch(forecastUrl)
                .then(forecastResponse => forecastResponse.json())
                .then(forecastData => {
                    var forecastHtml = '<h5>未来6小时预报：</h5><div style="display: flex; flex-wrap: wrap;">';
                    var forecasts = forecastData.list.slice(0, 6);
                    
                    forecasts.forEach(item => {
                        var time = new Date(item.dt * 1000).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'});
                        forecastHtml += `
                            <div style="width: 50%; padding: 5px; text-align: center;">
                                <p>${time}</p>
                                <p>${Math.round(item.main.temp)}°C</p>
                                <p>${item.weather[0].main}</p>
                            </div>
                        `;
                    });
                    forecastHtml += '</div>';
                    
                    var outdoorSuitable = isSuitableForOutdoor(data);
                    
                    var weatherInfo = `
                        <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
                            <h4>🌤️ ${locationName} 实时天气</h4>
                            <p>📍 位置：${locationName}</p>
                            <p>⏰ 时间：${new Date().toLocaleString('zh-CN')}</p>
                            <p>🌡️ 温度：${data.main.temp}°C (体感 ${data.main.feels_like}°C)</p>
                            <p>☁️ 天气：${data.weather[0].description}</p>
                            <p>💧 湿度：${data.main.humidity}%</p>
                            <p>🔽 气压：${data.main.pressure} hPa</p>
                            <p>👁️ 能见度：${(data.visibility/1000).toFixed(1)} km</p>
                            <p>💨 风速：${data.wind.speed} m/s ${getWindDirection(data.wind.deg)}</p>
                            <p>🌪️ 风力：${getWindLevel(data.wind.speed)}级</p>
                            <p>☀️ 紫外线指数：${getUVIndex()}</p>
                            <p>🌫️ PM2.5：${getPM25()}</p>
                            <p style="color: ${outdoorSuitable.color}; font-weight: bold;">🌳 适宜外出：${outdoorSuitable.text}</p>
                            <p>👕 建议穿衣：${getDressIndex(data.main.temp)}</p>
                            
                            ${forecastHtml}
                            
                            <div style="margin-top: 10px; padding: 8px; background-color: #e8f4fd; border-radius: 4px;">
                                <h5>📋 生活指数：</h5>
                                <p>🚗 洗车：${getCarWashIndex(data.weather[0].main)}</p>
                                <p>🏃 运动：${getExerciseIndex(data.weather[0].main, data.main.humidity)}</p>
                            </div>
                        </div>
                    `;
                    document.getElementById("info-panel").innerHTML = weatherInfo;
                    hideLoading();
                })
                .catch(forecastError => {
                    console.error('获取预报信息失败:', forecastError);
                    showCurrentWeatherOnly(data, locationName);
                    hideLoading();
                });
        })
        .catch(error => {
            console.error('获取天气信息失败:', error);
            hideLoading();
            alert('获取天气信息失败');
        });
}

function showCurrentWeatherOnly(data, locationName) {
    var outdoorSuitable = isSuitableForOutdoor(data);
    
    var weatherInfo = `
        <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
            <h4>🌤️ ${locationName} 实时天气</h4>
            <p>📍 位置：${locationName}</p>
            <p>⏰ 时间：${new Date().toLocaleString('zh-CN')}</p>
            <p>🌡️ 温度：${data.main.temp}°C</p>
            <p>☁️ 天气：${data.weather[0].description}</p>
            <p>💧 湿度：${data.main.humidity}%</p>
            <p>💨 风速：${data.wind.speed} m/s</p>
            <p style="color: ${outdoorSuitable.color}; font-weight: bold;">🌳 适宜外出：${outdoorSuitable.text}</p>
            <p>👕 建议穿衣：${getDressIndex(data.main.temp)}</p>
        </div>
    `;
    document.getElementById("info-panel").innerHTML = weatherInfo;
}

function isSuitableForOutdoor(weatherData) {
    var temp = weatherData.main.temp;
    var humidity = weatherData.main.humidity;
    var weatherMain = weatherData.weather[0].main;
    
    if (weatherMain === 'Rain' || weatherMain === 'Snow' || weatherMain === 'Thunderstorm') {
        return {text: '❌ 不适宜', color: '#e74c3c'};
    } else if (temp < 10 || temp > 35) {
        return {text: '⚠️ 不太适宜', color: '#f39c12'};
    } else if (humidity > 80) {
        return {text: '⚠️ 不太适宜', color: '#f39c12'};
    } else {
        return {text: '✅ 适宜', color: '#27ae60'};
    }
}

function getWindDirection(deg) {
    var directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    var index = Math.round(deg / 45) % 8;
    return directions[index];
}

function getWindLevel(speed) {
    if (speed < 0.3) return 0;
    else if (speed < 1.5) return 1;
    else if (speed < 3.3) return 2;
    else if (speed < 5.4) return 3;
    else if (speed < 7.9) return 4;
    else if (speed < 10.7) return 5;
    else if (speed < 13.8) return 6;
    else if (speed < 17.1) return 7;
    else if (speed < 20.7) return 8;
    else if (speed < 24.4) return 9;
    else if (speed < 28.4) return 10;
    else if (speed < 32.6) return 11;
    else return 12;
}

function getUVIndex() {
    var hour = new Date().getHours();
    if (hour >= 10 && hour <= 16) return "中等";
    else if (hour >= 8 && hour <= 18) return "低";
    else return "无";
}

function getPM25() {
    return Math.floor(Math.random() * 50) + 15;
}

function getDressIndex(temp) {
    if (temp < 5) return "厚重羽绒服";
    else if (temp < 10) return "毛衣外套";
    else if (temp < 18) return "薄外套";
    else if (temp < 25) return "单衣单裤";
    else return "短袖短裤";
}

function getCarWashIndex(weatherMain) {
    if (weatherMain === 'Rain' || weatherMain === 'Snow') return "不适宜";
    else return "适宜";
}

function getExerciseIndex(weatherMain, humidity) {
    if (weatherMain === 'Rain' || weatherMain === 'Snow') return "室内运动";
    else if (humidity > 80) return "轻度运动";
    else return "正常运动";
}

// 交通状况功能
function showTraffic() {
    if (!isTrafficOn) {
        // 开启实时路况
        enableTrafficLayer();
        document.getElementById("info-panel").innerHTML = `
            <div style="padding: 15px; background-color: #e8f4fd; border-radius: 8px; border-left: 4px solid #3498db;">
                <h4>🚦 实时路况已开启</h4>
                <p>✅ 正在显示广州市实时交通状况</p>
                <p>🔴 <b>红色</b>：拥堵路段</p>
                <p>🟡 <b>黄色</b>：缓行路段</p>
                <p>🟢 <b>绿色</b>：畅通路段</p>
                <p>⏰ 更新时间：${new Date().toLocaleTimeString('zh-CN')}</p>
                <button onclick="showTrafficInfo()" style="margin-top:10px; padding: 8px; background-color: #2c3e50;">📊 查看详细路况</button>
                <button onclick="hideTraffic()" style="margin-top:10px; padding: 8px; background-color: #e74c3c;">❌ 关闭路况</button>
            </div>
        `;
    } else {
        // 已经开启，显示详细路况信息
        showTrafficInfo();
    }
}

// 开启实时路况图层
function enableTrafficLayer() {
    console.log("开启路况...");
    
    // 先确保关闭现有的路况
    if (isTrafficOn) {
        hideTraffic();
        // 等待一下再开启新的
        setTimeout(function() {
            createTrafficLayer();
        }, 300);
        return;
    }
    
    createTrafficLayer();
}

function createTrafficLayer() {
    try {
        // 方法1：使用百度地图的标准方法
        if (typeof map.setTrafficOn === 'function') {
            console.log("使用 map.setTrafficOn()");
            map.setMapType(BMAP_NORMAL_MAP);
            map.setTrafficOn();
        } 
        // 方法2：创建TrafficLayer实例
        else if (typeof BMapGL.TrafficLayer !== 'undefined') {
            console.log("创建 BMapGL.TrafficLayer 实例");
            
            // 如果已有实例，先移除
            if (trafficLayer) {
                try {
                    // 尝试各种移除方法
                    if (map.removeTileLayer) map.removeTileLayer(trafficLayer);
                    if (trafficLayer.hide) trafficLayer.hide();
                    if (trafficLayer.clear) trafficLayer.clear();
                } catch (e) {
                    console.log("清除旧图层失败:", e);
                }
                trafficLayer = null;
            }
            
            // 创建新的交通图层
            trafficLayer = new BMapGL.TrafficLayer({
                predictDate: new Date()
            });
            
            // 添加到地图
            map.addTileLayer(trafficLayer);
            
            // 如果添加后没有显示，尝试强制重绘
            setTimeout(function() {
                var currentCenter = map.getCenter();
                map.setCenter(currentCenter);
            }, 100);
        } 
        // 方法3：如果都不行，显示错误
        else {
            throw new Error("不支持交通图层功能");
        }
        
        // 更新状态
        isTrafficOn = true;
        
        // 更新按钮状态
        updateTrafficButton(true);
        
        console.log("路况开启完成");
        
    } catch (error) {
        console.error("开启路况失败:", error);
        alert("开启路况失败: " + error.message);
    }
}

// 关闭实时路况
function hideTraffic() {
    console.log("尝试关闭路况，当前isTrafficOn:", isTrafficOn);
    
    if (!isTrafficOn) {
        console.log("路况已经关闭，无需操作");
        return;
    }
    
    try {
        // 方法1：使用百度地图的标准方法（如果可用）
        if (typeof map.setTrafficOff === 'function') {
            console.log("使用 map.setTrafficOff()");
            map.setTrafficOff();
        }
        // 方法2：尝试清除交通图层
        else if (trafficLayer) {
            console.log("尝试移除 trafficLayer");
            
            // 注意：BMapGL.TrafficLayer 可能不支持 removeTileLayer
            // 尝试直接销毁图层
            try {
                // 尝试清空图层的内部数据
                if (trafficLayer.clear && typeof trafficLayer.clear === 'function') {
                    trafficLayer.clear();
                }
                
                // 尝试移除
                if (map.removeTileLayer && typeof map.removeTileLayer === 'function') {
                    map.removeTileLayer(trafficLayer);
                }
                
                // 最后尝试移除整个图层
                if (trafficLayer.hide && typeof trafficLayer.hide === 'function') {
                    trafficLayer.hide();
                }
                
            } catch (e) {
                console.log("移除trafficLayer失败:", e);
                
                // 如果标准方法失败，尝试重新加载地图
                forceRemoveTraffic();
            }
            
            trafficLayer = null;
        }
        
        // 方法3：重新加载地图区域（强制刷新）
        setTimeout(function() {
            if (isTrafficOn) { // 如果状态仍未改变
                console.log("状态未更新，尝试强制刷新地图");
                forceRemoveTraffic();
            }
        }, 200);
        
        // 更新状态
        isTrafficOn = false;
        
        // 更新信息面板
        document.getElementById("info-panel").innerHTML = `
            <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <p>✅ 实时路况已关闭</p>
                <button onclick="showTraffic()" style="margin-top:10px; padding: 8px;">🚦 重新开启路况</button>
            </div>
        `;
        
        // 更新按钮状态
        updateTrafficButton(false);
        
        console.log("路况关闭完成");
        
    } catch (error) {
        console.error("关闭路况失败:", error);
        alert("关闭路况失败：" + error.message);
    }
}

// 强制移除交通图层（备用方法）
function forceRemoveTraffic() {
    console.log("执行强制移除...");
    
    // 1. 重新设置地图中心（强制重绘）
    var center = map.getCenter();
    var zoom = map.getZoom();
    
    // 2. 重新设置地图（这会清除所有图层）
    map.centerAndZoom(center, zoom);
    
    // 3. 重置变量
    isTrafficOn = false;
    trafficLayer = null;
    
    // 4. 更新界面
    updateTrafficButton(false);
    
    console.log("强制移除完成");
}

// 显示详细路况信息
function showTrafficInfo() {
    // 获取当前时间
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    
    // 判断当前时段
    var timePeriod = "平峰时段";
    var trafficLevel = "畅通";
    var suggestion = "建议正常出行";
    
    if ((hours >= 7 && hours < 9) || (hours >= 17 && hours < 19)) {
        timePeriod = "高峰时段";
        trafficLevel = "部分拥堵";
        suggestion = "建议错峰出行或选择公共交通";
    } else if (hours >= 9 && hours < 17) {
        timePeriod = "日间平峰";
        trafficLevel = "基本畅通";
        suggestion = "建议正常出行";
    } else {
        timePeriod = "夜间时段";
        trafficLevel = "非常畅通";
        suggestion = "建议自驾出行";
    }
    
    // 模拟主要道路状况（实际项目中可以调用路况API）
    var mainRoads = [
        { name: "广州大道", status: getRandomTrafficStatus() },
        { name: "环市路", status: getRandomTrafficStatus() },
        { name: "中山大道", status: getRandomTrafficStatus() },
        { name: "黄埔大道", status: getRandomTrafficStatus() },
        { name: "东风路", status: getRandomTrafficStatus() }
    ];
    
    var roadsHtml = '';
    mainRoads.forEach(road => {
        var color = getTrafficColor(road.status);
        var emoji = getTrafficEmoji(road.status);
        roadsHtml += `<p>${emoji} <b>${road.name}</b>: <span style="color:${color}">${road.status}</span></p>`;
    });
    
    // 更新信息面板
    document.getElementById("info-panel").innerHTML = `
        <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
            <h4>🚦 广州市实时路况报告</h4>
            <p><b>当前时间:</b> ${hours}:${minutes < 10 ? '0' + minutes : minutes}</p>
            <p><b>时段分析:</b> ${timePeriod}</p>
            <p><b>整体状况:</b> <span style="color:${getTrafficColor(trafficLevel)}">${trafficLevel}</span></p>
            <p><b>出行建议:</b> ${suggestion}</p>
            
            <div style="margin: 15px 0; padding: 10px; background: white; border-radius: 6px;">
                <h5 style="margin-top: 0;">主要道路状况:</h5>
                ${roadsHtml}
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 6px;">
                <p><b>🚇 地铁运行:</b> 正常</p>
                <p><b>🚌 公交线路:</b> 全部正常运行</p>
                <p><b>🚗 限行提醒:</b> 今日无限行</p>
            </div>
            
            <button onclick="hideTraffic()" style="margin-top:15px; padding: 10px; width: 100%; background-color: #e74c3c; color: white;">❌ 关闭路况显示</button>
        </div>
    `;
}

// 辅助函数
function getRandomTrafficStatus() {
    var statuses = ["畅通", "基本畅通", "缓行", "拥堵", "严重拥堵"];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

function getTrafficColor(status) {
    switch(status) {
        case "畅通": return "#27ae60";
        case "基本畅通": return "#2ecc71";
        case "缓行": return "#f39c12";
        case "拥堵": return "#e74c3c";
        case "严重拥堵": return "#c0392b";
        default: return "#7f8c8d";
    }
}

function getTrafficEmoji(status) {
    switch(status) {
        case "畅通": return "🟢";
        case "基本畅通": return "🟢";
        case "缓行": return "🟡";
        case "拥堵": return "🔴";
        case "严重拥堵": return "🔴";
        default: return "⚪";
    }
}

// 更新交通按钮状态
function updateTrafficButton(isOn) {
    // 可以在这里更新按钮的样式或文本
    var trafficBtn = document.querySelector('button[onclick*="showTraffic"]');
    if (trafficBtn) {
        if (isOn) {
            trafficBtn.innerHTML = "🚦 路况(开)";
            trafficBtn.style.backgroundColor = "#3498db";
        } else {
            trafficBtn.innerHTML = "🚦 交通状况";
            trafficBtn.style.backgroundColor = "";
        }
    }
}

// 收藏功能
function addToFavorites(name, lng, lat) {
    var favorite = {
        name: name,
        lng: lng,
        lat: lat,
        timestamp: new Date()
    };
    
    // 检查是否已存在
    var exists = favorites.some(fav => fav.name === name && fav.lng === lng && fav.lat === lat);
    if (!exists) {
        favorites.push(favorite);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        alert(`✅ 已收藏: ${name}`);
    } else {
        alert(`⚠️ ${name} 已在收藏夹中`);
    }
}

function showFavorites() {
    if (favorites.length === 0) {
        document.getElementById("info-panel").innerHTML = '<p>⭐ 暂无收藏地点</p>';
        return;
    }
    
    var html = '<div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #f39c12;"><h4>⭐ 我的收藏</h4>';
    favorites.forEach(function(fav, index) {
        html += `
            <div style="border-bottom: 1px solid #eee; padding: 8px 0; cursor: pointer; background: #fff; margin: 5px 0; border-radius: 6px; padding: 10px;" 
                 onclick="goToFavorite(${fav.lng}, ${fav.lat}, '${fav.name}')">
                <p style="margin: 0 0 3px 0; font-weight: bold; color: #2c3e50;">${fav.name}</p>
                <p style="margin: 0; color: #888; font-size: 12px;">📅 ${new Date(fav.timestamp).toLocaleDateString()}</p>
                <button onclick="removeFromFavorites(${index}); event.stopPropagation();" style="margin-top: 5px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">🗑️ 删除</button>
            </div>
        `;
    });
    html += '</div>';
    
    document.getElementById("info-panel").innerHTML = html;
}

function goToFavorite(lng, lat, name) {
    var pt = new BMapGL.Point(lng, lat);
    map.setCenter(pt);
    map.setZoom(16);
    
    document.getElementById("info-panel").innerHTML = 
        `<p>✅ 已跳转到收藏地点: <b>${name}</b></p>`;
}

function removeFromFavorites(index) {
    favorites.splice(index, 1);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    showFavorites(); // 重新显示收藏列表
}
// 周边搜索功能
function searchNearby() {
    var keyword = prompt("请输入要搜索的类型（如：餐厅、超市、医院等）：");
    if (!keyword) {
        return;
    }
    
    if (!myLocationPoint) {
        alert("请先定位");
        return;
    }
    
    showLoading();
    
    // 清除之前的周边搜索结果标记
    clearNearbyMarkers();
    
    // 使用百度地图API进行周边搜索
    var localSearch = new BMapGL.LocalSearch(map, {
        renderOptions: {
            map: map,
            autoViewport: true
        },
        pageCapacity: 15, // 设置每页容量
        onSearchComplete: function(results) {
            hideLoading();
            
            // 检查搜索结果是否成功
            if (results && results.getCurrentNumPois && results.getCurrentNumPois() > 0) {
                var pois = results.getPois ? results.getPois() : [];
                pois = pois.slice(0, 15); // 限制显示数量
                
                document.getElementById("info-panel").innerHTML = 
                    `<p>✅ 找到 ${pois.length} 个 "${keyword}" 相关地点</p>`;
                
                var resultsHtml = `<h4>🔍 "${keyword}" 搜索结果:</h4>`;
                if (pois.length > 0) {
                    for (var i = 0; i < pois.length; i++) {
                        var poi = pois[i];
                        if (!poi.point) continue; // 确保有坐标
                        
                        var poiPoint = new BMapGL.Point(poi.point.lng, poi.point.lat);
                        var distance = getDistance(myLocationPoint, poiPoint);
                        
                       // 为每个搜索结果创建标记
                       var marker = new BMapGL.Marker(poiPoint, {
                        icon: createCustomMarkerIcon('#f39c12', '🔍') // 使用橙色标记表示搜索结果，并指定emoji
                     });
                     map.addOverlay(marker);
                     nearbyMarkers.push(marker); // 将标记添加到数组中
                        
                        // 创建信息窗口
                        var content = `
                            <div style="font-size:14px;">
                                <h4 style='margin:0 0 8px 0; color: #2c3e50;'>${poi.title || poi.name}</h4>
                                <p><b>地址：</b>${poi.address || '暂无地址信息'}</p>
                                <p><b>电话：</b>${poi.phone || '暂无'}</p>
                                <p><b>距离：</b>${distance.toFixed(2)} km</p>
                                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                                    <button onclick="setDest('${(poi.title || poi.name).replace(/'/g, "\\'")}', ${poi.point.lng}, ${poi.point.lat})" style="margin-top:5px;width:100%; padding: 8px;">📍 去这里</button>
                                    <button onclick="addToFavorites('${(poi.title || poi.name).replace(/'/g, "\\'")}', ${poi.point.lng}, ${poi.point.lat})" style="margin-top:5px;width:100%;background-color: #f39c12; color: #fff; padding: 8px;">⭐ 收藏</button>
                                </div>
                            </div>
                        `;
                        
                        var infoWindow = new BMapGL.InfoWindow(content, {width: 280, height: 320});
                        
                        // 绑定点击事件
                        marker.addEventListener("click", function() {
                            map.openInfoWindow(infoWindow, poiPoint);
                        });
                        
                        resultsHtml += `
                            <div style="border-bottom: 1px solid #eee; padding: 8px 0; cursor: pointer; background: #f9f9f9; margin: 5px 0; border-radius: 6px; padding: 10px;" 
                                 onclick="selectNearbyResult(${poi.point.lng}, ${poi.point.lat}, '${(poi.title || poi.name).replace(/'/g, "\\'")}', ${distance.toFixed(2)})">
                                <p style="margin: 0 0 5px 0; font-weight: bold; color: #2c3e50;">${poi.title || poi.name}</p>
                                <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">📍 ${poi.address || '地址未知'}</p>
                                <p style="margin: 0; color: #888; font-size: 12px;">📏 距离: ${distance.toFixed(2)} km</p>
                            </div>
                        `;
                    }
                } else {
                    resultsHtml += '<p>❌ 未找到相关地点</p>';
                }
                document.getElementById("info-panel").innerHTML = resultsHtml;
            } else {
                // 如果没有结果，显示提示信息
                document.getElementById("info-panel").innerHTML = 
                    `<p>❌ 未找到"${keyword}"相关地点，请尝试其他关键词</p>`;
            }
        },
        onError: function(error) {
            hideLoading();
            console.error("搜索错误:", error);
            alert("❌ 搜索出错: " + error);
        }
    });
    
    // 搜索周边
    localSearch.searchNearby(keyword, myLocationPoint, 2000); // 搜索半径2000米
}

// 清除周边搜索结果标记
function clearNearbyMarkers() {
    // 移除所有周边搜索标记
    for(var i = 0; i < nearbyMarkers.length; i++) {
        map.removeOverlay(nearbyMarkers[i]);
    }
    nearbyMarkers = []; // 清空数组
}

function selectNearbyResult(lng, lat, title, distance) {
    var pt = new BMapGL.Point(lng, lat);
    map.setCenter(pt);
    map.setZoom(17);
    
    document.getElementById("info-panel").innerHTML = 
        `<p>✅ 已选择: <b>${title}</b><br>📏 距离您: ${distance} km</p>`;
}

function getDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    var lat1 = point1.lat * Math.PI / 180;
    var lat2 = point2.lat * Math.PI / 180;
    var deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
    var deltaLng = (point2.lng - point1.lng) * Math.PI / 180;

    var a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var distance = 6371 * c;
    
    return distance;
}

// 路径查询功能
function openRouteModal() {
    document.getElementById("routeModal").style.display = "block";
}

function closeRouteModal() {
    document.getElementById("routeModal").style.display = "none";
}

function setDest(name, lng, lat) {
    document.getElementById("endPoint").value = name;
    document.getElementById("info-panel").innerHTML = `已选择终点: <b>${name}</b>`;
}

function startRoute() {
    var start = document.getElementById("startPoint").value;
    var end = document.getElementById("endPoint").value;
    var travelMode = document.getElementById("travelMode").value;

    if (!end) {
        alert("请输入终点");
        return;
    }

    var startPoint = null;
    
    if (start === "我的位置" && myLocationPoint) {
        startPoint = myLocationPoint;
    } else {
        // 解析地址
        var myGeo = new BMapGL.Geocoder();
        myGeo.getPoint(start, function(point) {
            if (point) {
                startPoint = point;
                performRouteSearch(startPoint, end, travelMode);
            } else {
                alert("无法解析起点地址");
            }
        }, "广州市");
        return;
    }
    
    performRouteSearch(startPoint, end, travelMode);
}

function performRouteSearch(startPoint, end, travelMode) {
    showLoading();
    
    // 清除之前的路径
    clearRoute();
    
    // 根据交通方式创建不同的路线查询器
    if (travelMode === 'driving') {
        routeSearcher = new BMapGL.DrivingRoute(map, {
            renderOptions: {map: map, autoViewport: true},
            onSearchComplete: function(results) {
                if (routeSearcher.getStatus() !== BMAP_STATUS_SUCCESS) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到路线";
                    hideLoading();
                    return;
                }
                
                if (!results || results.getNumPlans() === 0) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到合适的路线";
                    hideLoading();
                    return;
                }
                
                var plan = results.getPlan(0);
                var distance = plan.getDistance(false);
                var duration = plan.getDuration(false);
                
                var hours = Math.floor(duration / 3600);
                var minutes = Math.floor((duration % 3600) / 60);
                var seconds = Math.floor(duration % 60);
                
                document.getElementById("info-panel").innerHTML = `
                    <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
                        <h4>🚗 驾车路线</h4>
                        <p>📏 距离：${(distance/1000).toFixed(2)} km</p>
                        <p>⏱️ 预计用时：${hours}小时${minutes}分钟${seconds}秒</p>
                    </div>
                `;
                
                hideLoading();
            }
        });
        routeSearcher.search(startPoint, end);
    } else if (travelMode === 'transit') {
        routeSearcher = new BMapGL.TransitRoute(map, {
            renderOptions: {map: map, autoViewport: true},
            onSearchComplete: function(results) {
                if (routeSearcher.getStatus() !== BMAP_STATUS_SUCCESS) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到路线";
                    hideLoading();
                    return;
                }
                
                if (!results || results.getNumPlans() === 0) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到合适的路线";
                    hideLoading();
                    return;
                }
                
                var plan = results.getPlan(0);
                var distance = plan.getDistance(false);
                var duration = plan.getDuration(false);
                
                var hours = Math.floor(duration / 3600);
                var minutes = Math.floor((duration % 3600) / 60);
                var seconds = Math.floor(duration % 60);
                
                document.getElementById("info-panel").innerHTML = `
                    <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
                        <h4>🚌 公交路线</h4>
                        <p>📏 距离：${(distance/1000).toFixed(2)} km</p>
                        <p>⏱️ 预计用时：${hours}小时${minutes}分钟${seconds}秒</p>
                    </div>
                `;
                
                hideLoading();
            }
        });
        routeSearcher.search(startPoint, end);
    } else if (travelMode === 'walking') {
        routeSearcher = new BMapGL.WalkingRoute(map, {
            renderOptions: {map: map, autoViewport: true},
            onSearchComplete: function(results) {
                if (routeSearcher.getStatus() !== BMAP_STATUS_SUCCESS) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到路线";
                    hideLoading();
                    return;
                }
                
                if (!results || results.getNumPlans() === 0) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到合适的路线";
                    hideLoading();
                    return;
                }
                
                var plan = results.getPlan(0);
                var distance = plan.getDistance(false);
                var duration = plan.getDuration(false);
                
                var hours = Math.floor(duration / 3600);
                var minutes = Math.floor((duration % 3600) / 60);
                var seconds = Math.floor(duration % 60);
                
                document.getElementById("info-panel").innerHTML = `
                    <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
                        <h4>🚶 步行路线</h4>
                        <p>📏 距离：${(distance/1000).toFixed(2)} km</p>
                        <p>⏱️ 预计用时：${hours}小时${minutes}分钟${seconds}秒</p>
                    </div>
                `;
                
                hideLoading();
            }
        });
        routeSearcher.search(startPoint, end);
    } else if (travelMode === 'riding') {
        routeSearcher = new BMapGL.RidingRoute(map, {
            renderOptions: {map: map, autoViewport: true},
            onSearchComplete: function(results) {
                if (routeSearcher.getStatus() !== BMAP_STATUS_SUCCESS) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到路线";
                    hideLoading();
                    return;
                }
                
                if (!results || results.getNumPlans() === 0) {
                    document.getElementById("info-panel").innerHTML = "❌ 未找到合适的路线";
                    hideLoading();
                    return;
                }
                
                var plan = results.getPlan(0);
                var distance = plan.getDistance(false);
                var duration = plan.getDuration(false);
                
                var hours = Math.floor(duration / 3600);
                var minutes = Math.floor((duration % 3600) / 60);
                var seconds = Math.floor(duration % 60);
                
                document.getElementById("info-panel").innerHTML = `
                    <div style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
                        <h4>🚴 骑行路线</h4>
                        <p>📏 距离：${(distance/1000).toFixed(2)} km</p>
                        <p>⏱️ 预计用时：${hours}小时${minutes}分钟${seconds}秒</p>
                    </div>
                `;
                
                hideLoading();
            }
        });
        routeSearcher.search(startPoint, end);
    }
}

function clearRoute() {
    if (routePolyline) {
        map.removeOverlay(routePolyline);
        routePolyline = null;
    }
    if (routeSearcher) {
        routeSearcher.clearResults();
    }
}

// 修改记录步骤函数
function recordStep(e) {
    if (!isTracking) return;

    // 添加新的点位
    trackPath.push(e.latlng);

    // 创建路径线
    if (trackPolyline) map.removeOverlay(trackPolyline);
    trackPolyline = new BMapGL.Polyline(trackPath, {
        strokeColor: "#3498db",
        strokeWeight: 6,
        strokeOpacity: 0.5
    });
    map.addOverlay(trackPolyline);
}

// 计算总距离函数
function calculateTotalDistance(path) {
    if (!path || path.length < 2) {
        return 0;
    }
    
    var totalDistance = 0;
    for (var i = 1; i < path.length; i++) {
        var point1 = path[i-1];
        var point2 = path[i];
        
        // 使用百度地图的距离计算方法
        var distance = map.getDistance(new BMapGL.Point(point1.lng, point1.lat), 
                                      new BMapGL.Point(point2.lng, point2.lat));
        if (distance) {
            totalDistance += distance;
        }
    }
    
    // 返回公里数
    return totalDistance / 1000;
}
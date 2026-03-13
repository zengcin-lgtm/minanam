// ==========================================
// 阿美族語學習網 - 後端 API (Google Apps Script)
// ==========================================

// ★★★ 分別設定兩個工作表的名稱 ★★★
var SHEET_USERS = "users"; 
var SHEET_SCORES = "scores"; 

function doOptions(e) {
  return buildResponse({status: "success"});
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 取得兩個工作表
    var sheetUsers = ss.getSheetByName(SHEET_USERS);
    var sheetScores = ss.getSheetByName(SHEET_SCORES);
    
    if (!sheetUsers) return buildResponse({status: "error", message: "找不到指定的工作表: " + SHEET_USERS});
    if (!sheetScores) return buildResponse({status: "error", message: "找不到指定的工作表: " + SHEET_SCORES});

    // 根據 action 導向不同的處理函式
    if (action === "login") {
      return handleLogin(sheetUsers, payload);
    } else if (action === "register") {
      return handleRegister(sheetUsers, sheetScores, payload);
    } else if (action === "submitScore") {
      return handleSubmitScore(sheetScores, payload);
    } else if (action === "getScores") {
      return handleGetScores(sheetScores, payload);
    } else if (action === "getLeaderboard") {
      return handleGetLeaderboard(sheetScores);
    }
    
    return buildResponse({status: "error", message: "未知的 action"});
    
  } catch (error) {
    return buildResponse({status: "error", message: error.toString()});
  }
}

// ==========================================
// 1. 處理註冊 (users 與 scores 分頁同步建立)
// ==========================================
function handleRegister(sheetUsers, sheetScores, payload) {
  var data = sheetUsers.getDataRange().getValues();
  
  // 檢查帳號是否已存在
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.userID) {
      return buildResponse({status: "error", message: "此帳號已經被註冊過囉！"});
    }
  }
  
  var now = new Date();
  var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");

  // 寫入 users 分頁 (A~G 欄)
  var newUserRow = [
    payload.userID,           // A: userID
    payload.password,         // B: password
    payload.name,             // C: name
    timestamp,                // D: created_at
    "public",                 // E: 身分
    payload.tribe || "",      // F: 族別
    payload.birthDate || ""   // G: 出生年月
  ];
  sheetUsers.appendRow(newUserRow);
  
  // 防呆：如果 scores 工作表全空，先加標題
  if (sheetScores.getLastRow() === 0) {
    sheetScores.appendRow(["userID", "name"]);
  }
  var newScoreRow = [payload.userID, payload.name];
  sheetScores.appendRow(newScoreRow);
  
  return buildResponse({status: "success", message: "註冊成功"});
}

// ==========================================
// 2. 處理登入 (讀取 users 分頁)
// ==========================================
function handleLogin(sheetUsers, payload) {
  var data = sheetUsers.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.userID && data[i][1] == payload.password) {
      return buildResponse({
        status: "success", 
        name: data[i][2], // C欄: name
        role: data[i][4]  // E欄: 身分
      });
    }
  }
  return buildResponse({status: "error", message: "帳號或密碼錯誤"});
}

// ==========================================
// 3. 處理上傳成績 (寫入 scores 分頁)
// ==========================================
function handleSubmitScore(sheetScores, payload) {
  if (sheetScores.getLastRow() === 0) {
    sheetScores.appendRow(["userID", "name"]);
  }

  var data = sheetScores.getDataRange().getValues();
  var headers = data[0] || ["userID", "name"];
  var gameID = payload.gameID;
  var score = parseInt(payload.score) || 0;
  
  var colIndex = headers.indexOf(gameID);
  if (colIndex === -1) {
    colIndex = headers.length;
    sheetScores.getRange(1, colIndex + 1).setValue(gameID);
  }
  
  var userFound = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.userID) {
      userFound = true;
      var currentScore = parseInt(data[i][colIndex]) || 0;
      if (score > currentScore) {
        sheetScores.getRange(i + 1, colIndex + 1).setValue(score);
      }
      break;
    }
  }
  
  if (!userFound) {
      var userName = "未知姓名";
      var sheetUsers = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
      if (sheetUsers) {
        var uData = sheetUsers.getDataRange().getValues();
        for (var u = 1; u < uData.length; u++) {
          if (uData[u][0] == payload.userID) {
            userName = uData[u][2];
            break;
          }
        }
      }

      var newRow = [payload.userID, userName];
      while (newRow.length < colIndex) {
        newRow.push("");
      }
      newRow[colIndex] = score;
      sheetScores.appendRow(newRow);
  }

  return buildResponse({status: "success"});
}

// ==========================================
// 4. 取得個人所有成績 (讀取 scores 分頁)
// ==========================================
function handleGetScores(sheetScores, payload) {
  var data = sheetScores.getDataRange().getValues();
  if (data.length === 0) return buildResponse({status: "success", scores: {}});

  var headers = data[0];
  var scores = {};
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.userID) {
      for (var j = 2; j < headers.length; j++) {
        if (headers[j]) {
          scores[headers[j]] = parseInt(data[i][j]) || 0;
        }
      }
      return buildResponse({status: "success", scores: scores});
    }
  }
  return buildResponse({status: "success", scores: {}});
}

// ==========================================
// 5. 取得榮譽排行榜 (讀取 scores 分頁)
// ==========================================
function handleGetLeaderboard(sheetScores) {
  var data = sheetScores.getDataRange().getValues();
  if (data.length <= 1) return buildResponse({status: "success", leaderboard: []});

  var headers = data[0];
  var leaderboard = [];
  
  for (var i = 1; i < data.length; i++) {
    var name = data[i][1];
    if (!name || name === "未知姓名") continue;
    
    var totalScore = 0;
    for (var j = 2; j < headers.length; j++) {
      totalScore += parseInt(data[i][j]) || 0;
    }
    
    if (totalScore > 0) {
      leaderboard.push({ name: name, score: totalScore });
    }
  }
  
  leaderboard.sort(function(a, b) {
    return b.score - a.score;
  });
  
  return buildResponse({status: "success", leaderboard: leaderboard});
}

// ==========================================
// 共用：建立 JSON 回應 (★已移除會當機的 setHeader)
// ==========================================
function buildResponse(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

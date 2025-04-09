# 词汇管理系统API接口总结

## 后端API接口

### 词汇级别(Vocabulary Levels)相关接口

1. **获取所有词汇级别**
   - 端点: `GET /api/vocabulary-levels`
   - 描述: 获取系统中所有可用的词汇级别
   - 返回: `{success: true, levels: [...]}`
   - 前端使用: 用于初始化级别下拉框、筛选单词和章节

2. **获取特定级别的章节**
   - 端点: `GET /api/vocabulary-levels/:levelIdOrName/chapters`
   - 描述: 获取指定词汇级别下的所有章节
   - 返回: `{success: true, chapters: [...]}`
   - 前端使用: 当用户选择级别时，加载该级别下的所有章节

### 章节(Chapters)相关接口

1. **获取所有章节**
   - 端点: `GET /api/chapters`
   - 描述: 获取所有章节，可用于初始化
   - 返回: 章节数组

2. **获取章节的单词**
   - 端点: `GET /api/chapters/:chapterId/words`
   - 描述: 获取指定章节中的所有单词
   - 返回: 单词数组
   - 前端使用: 当用户选择特定章节时，加载该章节的单词进行学习

3. **创建新章节**
   - 端点: `POST /api/chapters`
   - 描述: 创建新的章节
   - 参数: `{name, description, level_id, order_num}`
   - 返回: `{success: true, chapter: {...}}`
   - 前端使用: 管理员添加新章节时使用

### 单词(Words)相关接口

1. **添加单词**
   - 端点: `POST /api/words`
   - 描述: 添加新单词到数据库
   - 参数: `{word, meaning, phonetic, phrase, example, morphology, note, level_id, chapter_id, image_path}`
   - 返回: `{success: true, wordId: 123}`
   - 前端使用: 在单词管理界面添加新单词

2. **更新单词**
   - 端点: `PUT /api/words/:id`
   - 描述: 更新现有单词信息
   - 参数: `{word, phonetic, definition, chapter_id}`
   - 返回: `{success: true, message: '单词更新成功'}`
   - 前端使用: 在单词管理界面编辑单词

3. **删除单词**
   - 端点: `DELETE /api/words/:id`
   - 描述: 删除单词及其映射关系
   - 返回: `{success: true, message: '单词删除成功'}`
   - 前端使用: 在单词管理界面删除单词

4. **搜索单词**
   - 端点: `GET /api/words/search`
   - 描述: 按关键词搜索单词
   - 参数: `q`(查询参数)
   - 返回: 匹配的单词数组
   - 前端使用: 在单词管理界面搜索单词

5. **批量导入单词**
   - 端点: `POST /api/words/bulk-import`
   - 描述: 批量导入单词数据
   - 参数: `{jsonData}`(JSON格式的单词数组)
   - 返回: `{success: true, imported: 100}`
   - 前端使用: 从Excel导入单词时使用

## 前端实现

### 词汇管理页面主要功能

1. **词汇级别管理**
   - 查看所有级别
   - 添加新级别
   - 编辑和删除级别

2. **章节管理**
   - 按级别筛选查看章节
   - 添加新章节
   - 编辑和删除章节

3. **单词管理**
   - 按级别和章节筛选单词
   - 添加、编辑和删除单词
   - 搜索单词
   - 批量导入单词(通过Excel)

### API调用实现

前端使用的API基础URL配置:
```javascript
const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':5000/api';
```

API端点配置:
```javascript
const API_ENDPOINTS = {
    VOCABULARY_LEVELS: '/vocabulary-levels',
    LEVEL_CHAPTERS: '/vocabulary-levels/{id}/chapters',
    CHAPTERS: '/chapters',
    WORDS: '/chapters/{id}/words',
    IMPORT_WORDS: '/import-words',
    WORDS_SEARCH: '/words/search',
    WORDS_MANAGE: '/words',
    CREATE_CHAPTER: '/chapters'
};
```

所有API调用都使用fetch方法实现，并在请求头中包含token进行身份验证:
```javascript
fetch(url, {
    method: method,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(requestData)
})
```

## 数据结构

1. **词汇级别(VocabularyLevels)**
   - id: 唯一标识符
   - name: 级别名称(如"考研英语")
   - description: 级别描述
   - order_num: 排序序号

2. **章节(Chapters)**
   - id: 唯一标识符
   - name: 章节名称
   - description: 章节描述
   - order_num: 排序序号
   - level_id: 关联的词汇级别ID

3. **单词(Words)**
   - id: 唯一标识符
   - word: 单词本身
   - meaning/definition: 单词含义
   - phonetic: 音标
   - phrase: 短语示例
   - example: 使用示例
   - morphology: 词形变化
   - note: 备注
   - level_id: 关联的词汇级别ID
   - chapter_id: 关联的章节ID
   - image_path: 图片路径(可选)

## 注意事项

1. 前端存在部分不完整的函数实现，需要根据API接口要求进行补充完善
2. 单词表单中的字段名需要与后端API期望的字段保持一致(例如使用meaning而不是definition)
3. 章节ID可能在不同词汇级别间重复，导致冲突，需要确保唯一性
4. 级别切换时需要重新加载对应的章节列表
5. 单词保存时需要处理编辑和新增两种不同情况 
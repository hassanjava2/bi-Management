/**
 * UX Analyzer Module
 * تحليل واجهة المستخدم واقتراح تحسينات
 */

const fs = require('fs');
const path = require('path');
const { run, get, all } = require('../../config/database');
const { generateId, now } = require('../../utils/helpers');

class UXAnalyzer {
    constructor(bot) {
        this.bot = bot;
        this.frontendPath = path.join(__dirname, '../../../../frontend/src');
        this.suggestions = [];
    }
    
    /**
     * تحليل شامل
     */
    async analyze() {
        this.bot.log('🎨 Analyzing UX...');
        
        const suggestions = [];
        
        try {
            // Analyze components
            const componentSuggestions = await this._analyzeComponents();
            suggestions.push(...componentSuggestions);
            
            // Analyze forms
            const formSuggestions = await this._analyzeForms();
            suggestions.push(...formSuggestions);
            
            // Analyze navigation
            const navSuggestions = await this._analyzeNavigation();
            suggestions.push(...navSuggestions);
            
            // Analyze accessibility
            const a11ySuggestions = await this._analyzeAccessibility();
            suggestions.push(...a11ySuggestions);
            
            // Analyze performance patterns
            const perfSuggestions = await this._analyzePerformancePatterns();
            suggestions.push(...perfSuggestions);
            
            // Analyze error handling
            const errorSuggestions = await this._analyzeErrorHandling();
            suggestions.push(...errorSuggestions);
            
            // Store suggestions
            this._storeSuggestions(suggestions);
            
            if (suggestions.length > 0) {
                this.bot.log(`💡 Generated ${suggestions.length} UX suggestions`);
            }
            
        } catch (error) {
            this.bot.log(`UX analysis error: ${error.message}`, 'error');
        }
        
        return suggestions;
    }
    
    /**
     * تحليل المكونات
     */
    async _analyzeComponents() {
        const suggestions = [];
        
        const patterns = [
            {
                name: 'missing_loading_state',
                pattern: /useState.*\[\s*\w+,\s*set\w+\s*\].*=.*useState\s*\(\s*\[\s*\]\s*\)/,
                antiPattern: /loading|isLoading|setLoading/,
                suggestion: 'إضافة حالة تحميل (loading state) لتحسين تجربة المستخدم',
                priority: 'high',
                autoFix: true,
                fix: (content) => {
                    if (!content.includes('isLoading') && content.includes('useState([])')) {
                        return content.replace(
                            /(const \[(\w+), set\w+\] = useState\(\[\]\);)/,
                            '$1\n  const [isLoading, setIsLoading] = useState(true);'
                        );
                    }
                    return content;
                }
            },
            {
                name: 'missing_error_boundary',
                pattern: /catch\s*\(\s*error\s*\)/,
                antiPattern: /ErrorBoundary|error.*state|setError/,
                suggestion: 'إضافة معالجة أخطاء مرئية للمستخدم',
                priority: 'medium',
                autoFix: false
            },
            {
                name: 'hardcoded_text',
                pattern: />\s*(Submit|Cancel|Delete|Save|Edit|Add|Remove)\s*</i,
                suggestion: 'استخدام نصوص عربية أو ملفات ترجمة',
                priority: 'low',
                autoFix: true,
                fix: (content) => {
                    const translations = {
                        'Submit': 'إرسال',
                        'Cancel': 'إلغاء',
                        'Delete': 'حذف',
                        'Save': 'حفظ',
                        'Edit': 'تعديل',
                        'Add': 'إضافة',
                        'Remove': 'إزالة',
                        'Close': 'إغلاق',
                        'Loading': 'جاري التحميل',
                        'Search': 'بحث'
                    };
                    
                    let modified = content;
                    for (const [en, ar] of Object.entries(translations)) {
                        const regex = new RegExp(`>\\s*${en}\\s*<`, 'gi');
                        modified = modified.replace(regex, `>${ar}<`);
                    }
                    return modified;
                }
            },
            {
                name: 'missing_empty_state',
                pattern: /\.map\s*\(\s*\(/,
                antiPattern: /length\s*===\s*0|isEmpty|no.*found|empty/i,
                suggestion: 'إضافة رسالة عندما لا توجد بيانات',
                priority: 'medium',
                autoFix: false
            },
            {
                name: 'missing_confirmation',
                pattern: /onClick.*delete|remove|حذف/i,
                antiPattern: /confirm|modal|dialog/i,
                suggestion: 'إضافة تأكيد قبل الحذف',
                priority: 'high',
                autoFix: false
            }
        ];
        
        try {
            const componentFiles = this._getFiles(this.frontendPath, '.jsx');
            
            for (const file of componentFiles.slice(0, 20)) { // Limit to 20 files
                const content = this._readFile(file);
                if (!content) continue;
                
                for (const pattern of patterns) {
                    if (pattern.pattern.test(content)) {
                        if (!pattern.antiPattern || !pattern.antiPattern.test(content)) {
                            suggestions.push({
                                id: generateId(),
                                type: 'component',
                                component: path.basename(file),
                                file: file,
                                issue: pattern.name,
                                suggestion: pattern.suggestion,
                                priority: pattern.priority,
                                autoFix: pattern.autoFix,
                                fix: pattern.fix,
                                status: 'pending',
                                createdAt: now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            this.bot.log(`Component analysis error: ${error.message}`, 'warn');
        }
        
        return suggestions;
    }
    
    /**
     * تحليل النماذج
     */
    async _analyzeForms() {
        const suggestions = [];
        
        const formPatterns = [
            {
                name: 'missing_validation_message',
                pattern: /<input[^>]*required/,
                antiPattern: /error.*message|validation.*error|helperText/i,
                suggestion: 'إضافة رسائل خطأ واضحة للحقول المطلوبة',
                priority: 'high'
            },
            {
                name: 'missing_input_type',
                pattern: /<input(?![^>]*type=)/,
                suggestion: 'تحديد نوع الحقل (text, email, number, etc.)',
                priority: 'medium'
            },
            {
                name: 'missing_autocomplete',
                pattern: /<input[^>]*type=["'](email|password|tel)/,
                antiPattern: /autoComplete/,
                suggestion: 'إضافة autocomplete لتسهيل الإدخال',
                priority: 'low'
            },
            {
                name: 'form_without_onsubmit',
                pattern: /<form(?![^>]*onSubmit)/,
                suggestion: 'إضافة معالج onSubmit للنموذج',
                priority: 'high'
            }
        ];
        
        try {
            const files = this._getFiles(this.frontendPath, '.jsx');
            
            for (const file of files.slice(0, 15)) {
                const content = this._readFile(file);
                if (!content || !content.includes('<form') && !content.includes('<input')) continue;
                
                for (const pattern of formPatterns) {
                    if (pattern.pattern.test(content)) {
                        if (!pattern.antiPattern || !pattern.antiPattern.test(content)) {
                            suggestions.push({
                                id: generateId(),
                                type: 'form',
                                component: path.basename(file),
                                file: file,
                                issue: pattern.name,
                                suggestion: pattern.suggestion,
                                priority: pattern.priority,
                                status: 'pending',
                                createdAt: now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            this.bot.log(`Form analysis error: ${error.message}`, 'warn');
        }
        
        return suggestions;
    }
    
    /**
     * تحليل التنقل
     */
    async _analyzeNavigation() {
        const suggestions = [];
        
        try {
            // Check for breadcrumbs
            const pagesPath = path.join(this.frontendPath, 'pages');
            if (fs.existsSync(pagesPath)) {
                const pages = this._getFiles(pagesPath, '.jsx');
                
                for (const page of pages) {
                    const content = this._readFile(page);
                    if (content && !content.includes('Breadcrumb') && !content.includes('breadcrumb')) {
                        suggestions.push({
                            id: generateId(),
                            type: 'navigation',
                            component: path.basename(page),
                            file: page,
                            issue: 'missing_breadcrumb',
                            suggestion: 'إضافة شريط التنقل (Breadcrumb) لتسهيل التنقل',
                            priority: 'low',
                            status: 'pending',
                            createdAt: now()
                        });
                    }
                }
            }
        } catch (error) {
            this.bot.log(`Navigation analysis error: ${error.message}`, 'warn');
        }
        
        return suggestions;
    }
    
    /**
     * تحليل إمكانية الوصول
     */
    async _analyzeAccessibility() {
        const suggestions = [];
        
        const a11yPatterns = [
            {
                name: 'missing_alt_text',
                pattern: /<img(?![^>]*alt=)/,
                suggestion: 'إضافة نص بديل (alt) للصور',
                priority: 'high'
            },
            {
                name: 'missing_label',
                pattern: /<input(?![^>]*aria-label)(?![^>]*id=[^>]*<label)/,
                antiPattern: /label|aria-label|placeholder/,
                suggestion: 'إضافة تسمية (label) للحقول',
                priority: 'medium'
            },
            {
                name: 'low_color_contrast',
                pattern: /color:\s*['"]?#[a-fA-F0-9]{3,6}['"]?.*background.*#[a-fA-F0-9]{3,6}/,
                suggestion: 'التحقق من تباين الألوان للقراءة',
                priority: 'medium'
            },
            {
                name: 'missing_focus_indicator',
                pattern: /outline:\s*none|outline:\s*0/,
                suggestion: 'الحفاظ على مؤشر التركيز للتنقل بلوحة المفاتيح',
                priority: 'high'
            }
        ];
        
        try {
            const files = this._getFiles(this.frontendPath, '.jsx');
            
            for (const file of files.slice(0, 10)) {
                const content = this._readFile(file);
                if (!content) continue;
                
                for (const pattern of a11yPatterns) {
                    if (pattern.pattern.test(content)) {
                        if (!pattern.antiPattern || !pattern.antiPattern.test(content)) {
                            suggestions.push({
                                id: generateId(),
                                type: 'accessibility',
                                component: path.basename(file),
                                file: file,
                                issue: pattern.name,
                                suggestion: pattern.suggestion,
                                priority: pattern.priority,
                                status: 'pending',
                                createdAt: now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            this.bot.log(`A11y analysis error: ${error.message}`, 'warn');
        }
        
        return suggestions;
    }
    
    /**
     * تحليل أنماط الأداء
     */
    async _analyzePerformancePatterns() {
        const suggestions = [];
        
        const perfPatterns = [
            {
                name: 'missing_usememo',
                pattern: /\.filter\(.*\)\.map\(/,
                antiPattern: /useMemo/,
                suggestion: 'استخدام useMemo لتحسين الأداء مع الفلترة',
                priority: 'medium'
            },
            {
                name: 'inline_function_in_render',
                pattern: /onClick=\{\s*\(\)\s*=>/,
                antiPattern: /useCallback/,
                suggestion: 'استخدام useCallback للدوال المتكررة',
                priority: 'low'
            },
            {
                name: 'large_list_without_virtualization',
                pattern: /\.map\([^}]*{[^}]*}[^}]*\)/,
                antiPattern: /VirtualList|react-window|react-virtualized/,
                suggestion: 'استخدام القوائم الافتراضية للقوائم الطويلة',
                priority: 'medium'
            }
        ];
        
        try {
            const files = this._getFiles(this.frontendPath, '.jsx');
            
            for (const file of files.slice(0, 10)) {
                const content = this._readFile(file);
                if (!content) continue;
                
                for (const pattern of perfPatterns) {
                    if (pattern.pattern.test(content)) {
                        if (!pattern.antiPattern || !pattern.antiPattern.test(content)) {
                            suggestions.push({
                                id: generateId(),
                                type: 'performance',
                                component: path.basename(file),
                                file: file,
                                issue: pattern.name,
                                suggestion: pattern.suggestion,
                                priority: pattern.priority,
                                status: 'pending',
                                createdAt: now()
                            });
                        }
                    }
                }
            }
        } catch (error) {
            this.bot.log(`Performance analysis error: ${error.message}`, 'warn');
        }
        
        return suggestions;
    }
    
    /**
     * تحليل معالجة الأخطاء
     */
    async _analyzeErrorHandling() {
        const suggestions = [];
        
        try {
            const files = this._getFiles(this.frontendPath, '.jsx');
            
            for (const file of files.slice(0, 10)) {
                const content = this._readFile(file);
                if (!content) continue;
                
                // Check for API calls without error handling
                if (content.includes('axios') || content.includes('fetch')) {
                    if (!content.includes('catch') && !content.includes('try')) {
                        suggestions.push({
                            id: generateId(),
                            type: 'error_handling',
                            component: path.basename(file),
                            file: file,
                            issue: 'missing_error_handling',
                            suggestion: 'إضافة معالجة أخطاء لطلبات API',
                            priority: 'high',
                            status: 'pending',
                            createdAt: now()
                        });
                    }
                }
                
                // Check for console.error without user feedback
                if (content.includes('console.error') && !content.includes('toast') && !content.includes('alert') && !content.includes('setError')) {
                    suggestions.push({
                        id: generateId(),
                        type: 'error_handling',
                        component: path.basename(file),
                        file: file,
                        issue: 'no_user_error_feedback',
                        suggestion: 'عرض رسالة خطأ للمستخدم بدلاً من console فقط',
                        priority: 'medium',
                        status: 'pending',
                        createdAt: now()
                    });
                }
            }
        } catch (error) {
            this.bot.log(`Error handling analysis error: ${error.message}`, 'warn');
        }
        
        return suggestions;
    }
    
    /**
     * تطبيق اقتراح
     */
    async applySuggestion(suggestion) {
        if (!suggestion.autoFix || !suggestion.fix) {
            return { success: false, reason: 'No auto-fix available' };
        }
        
        try {
            const content = this._readFile(suggestion.file);
            if (!content) {
                return { success: false, reason: 'Could not read file' };
            }
            
            const newContent = suggestion.fix(content);
            
            if (newContent !== content) {
                fs.writeFileSync(suggestion.file, newContent, 'utf8');
                suggestion.status = 'applied';
                
                this.bot.logToDB('suggestion_applied', {
                    suggestion_id: suggestion.id,
                    file: suggestion.file,
                    type: suggestion.type
                });
                
                return { success: true };
            }
            
            return { success: false, reason: 'No changes needed' };
        } catch (error) {
            return { success: false, reason: error.message };
        }
    }
    
    /**
     * تطبيق الاقتراحات التلقائية
     */
    async applyAutoSuggestions(suggestions) {
        let applied = 0;
        
        const autoSuggestions = suggestions.filter(s => s.autoFix && s.priority === 'low');
        
        for (const suggestion of autoSuggestions) {
            const result = await this.applySuggestion(suggestion);
            if (result.success) {
                applied++;
            }
        }
        
        return applied;
    }
    
    /**
     * تخزين الاقتراحات
     */
    async _storeSuggestions(suggestions) {
        for (const suggestion of suggestions) {
            try {
                await run(`
                    INSERT INTO bot_suggestions 
                    (id, type, component, suggestion, priority, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (id) DO UPDATE SET
                        type = EXCLUDED.type, component = EXCLUDED.component,
                        suggestion = EXCLUDED.suggestion, priority = EXCLUDED.priority,
                        status = EXCLUDED.status, created_at = EXCLUDED.created_at
                `, [
                    suggestion.id,
                    suggestion.type,
                    suggestion.component,
                    suggestion.suggestion,
                    suggestion.priority,
                    suggestion.status,
                    suggestion.createdAt
                ]);
            } catch (error) {
                // Table might not exist
            }
        }
    }
    
    /**
     * Helper: قراءة ملف
     */
    _readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Helper: جلب الملفات
     */
    _getFiles(dir, extension) {
        const files = [];
        
        try {
            if (!fs.existsSync(dir)) return files;
            
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    files.push(...this._getFiles(fullPath, extension));
                } else if (item.endsWith(extension)) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Ignore errors
        }
        
        return files;
    }
}

module.exports = UXAnalyzer;

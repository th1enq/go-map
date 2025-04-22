// This is a patch to fix category buttons
document.addEventListener('DOMContentLoaded', function() {
    console.log("Applying category button fix patch");
    
    // Fix for selecting category buttons
    window.fixCategoryButtonSelector = function(category) {
        return document.querySelector(`.category-btn[data-category="${category}"]`);
    };
    
    // Override the problematic setupCategoryFiltersNew function
    window.setupCategoryFiltersNew = function() {
        console.log('Setting up category filters (patched implementation)...');
        
        // Initialize selected category from HTML
        const activeBtn = document.querySelector('.category-btn.active');
        if (activeBtn) {
            window.selectedCategory = activeBtn.getAttribute('data-category');
            console.log(`Initial category from HTML: ${window.selectedCategory}`);
            
            // Update the current category indicator
            updateCategoryIndicator(window.selectedCategory, activeBtn.textContent.trim());
        }
        
        // Add click handler to all category buttons
        document.querySelectorAll('.category-btn').forEach(button => {
            button.addEventListener('click', function(event) {
                const category = this.getAttribute('data-category');
                console.log(`Category button clicked: ${category}`);
                
                // Set this as the active button
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
                
                // Update the selected category
                window.selectedCategory = category;
                console.log(`Category updated to: ${window.selectedCategory}`);
                
                // Update the indicator
                updateCategoryIndicator(window.selectedCategory, this.textContent.trim());
                
                // Perform search if location is selected
                if (window.selectedLocation) {
                    console.log(`Location is selected, performing search with category: ${window.selectedCategory}`);
                    window.SearchPlaces();
                } else {
                    console.log('No location selected yet');
                    alert('Vui lòng chọn một vị trí trước khi tìm kiếm.');
                }
                
                // Stop event propagation
                event.preventDefault();
                event.stopPropagation();
            });
        });
        
        console.log('Patched category setup complete');
    };
    
    // Helper function to update the category indicator
    function updateCategoryIndicator(category, displayName) {
        const indicator = document.getElementById('current-category');
        if (indicator) {
            indicator.textContent = `Current: ${displayName || category}`;
            console.log(`Updated category indicator to: ${displayName || category}`);
        }
    }
});

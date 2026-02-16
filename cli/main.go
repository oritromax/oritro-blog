package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

func extractCategories(blogDir string) ([]string, error) {
	categoriesMap := make(map[string]bool)

	files, err := filepath.Glob(filepath.Join(blogDir, "*.md"))
	if err != nil {
		return nil, err
	}

	categoryRegex := regexp.MustCompile(`^\s*-\s+(.+)$`)

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			continue
		}

		lines := strings.Split(string(content), "\n")
		inCategories := false

		for _, line := range lines {

			if strings.HasPrefix(strings.TrimSpace(line), "categories:") {
				inCategories = true
				continue
			}

			if inCategories && (strings.HasPrefix(line, "---") ||
				(strings.Contains(line, ":") && !strings.HasPrefix(strings.TrimSpace(line), "-"))) {
				inCategories = false
			}

			if inCategories {
				matches := categoryRegex.FindStringSubmatch(line)
				if len(matches) > 1 {
					category := strings.TrimSpace(matches[1])
					categoriesMap[category] = true
				}
			}
		}
	}

	categories := make([]string, 0, len(categoriesMap))
	for category := range categoriesMap {
		categories = append(categories, category)
	}
	sort.Strings(categories)

	return categories, nil
}

func promptUser(prompt string) string {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print(prompt)
	input, _ := reader.ReadString('\n')
	return strings.TrimSpace(input)
}

func selectCategories(availableCategories []string) []string {
	fmt.Println("\nAvailable categories:")
	for i, cat := range availableCategories {
		fmt.Printf("%d. %s\n", i+1, cat)
	}

	fmt.Println("\nEnter category numbers separated by commas (e.g., 1,3,5)")
	fmt.Println("Or press Enter to skip category selection:")
	input := promptUser("")

	if input == "" {
		return []string{}
	}

	selectedCategories := []string{}
	indices := strings.Split(input, ",")

	for _, indexStr := range indices {
		indexStr = strings.TrimSpace(indexStr)
		var index int
		_, err := fmt.Sscanf(indexStr, "%d", &index)
		if err == nil && index > 0 && index <= len(availableCategories) {
			selectedCategories = append(selectedCategories, availableCategories[index-1])
		}
	}

	return selectedCategories
}

func generateFrontmatter(title, dateStr string, tags, categories []string) string {
	var sb strings.Builder

	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("title: %s\n", title))
	sb.WriteString(fmt.Sprintf("date: %s\n", dateStr))

	if len(tags) > 0 {
		sb.WriteString("tags:\n")
		for _, tag := range tags {
			sb.WriteString(fmt.Sprintf("    - %s\n", strings.TrimSpace(tag)))
		}
	}

	if len(categories) > 0 {
		sb.WriteString("categories:\n")
		for _, cat := range categories {
			sb.WriteString(fmt.Sprintf("    - %s\n", strings.TrimSpace(cat)))
		}
	}

	sb.WriteString("\n---\n")

	return sb.String()
}

func slugify(title string) string {

	slug := strings.ToLower(title)

	slug = strings.ReplaceAll(slug, " ", "-")

	reg := regexp.MustCompile(`[^a-z0-9-]+`)
	slug = reg.ReplaceAllString(slug, "")

	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")

	slug = strings.Trim(slug, "-")

	return slug
}

func findBlogDirectory() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	currentDir := cwd

	for i := 0; i < 5; i++ {
		blogPath := filepath.Join(currentDir, "src", "content", "blog")

		if _, err := os.Stat(blogPath); err == nil {
			return blogPath, nil
		}

		parentDir := filepath.Dir(currentDir)

		if parentDir == currentDir {
			break
		}

		currentDir = parentDir
	}

	return "", fmt.Errorf("blog directory not found. Make sure you're running this from within the project")
}

func main() {

	blogDir, err := findBlogDirectory()
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		fmt.Println("\nPlease run this command from within the oritro-blog project directory.")
		os.Exit(1)
	}

	fmt.Println("=== Blog Post Generator ===\n")

	fmt.Println("Scanning existing blog posts for categories...")
	availableCategories, err := extractCategories(blogDir)
	if err != nil {
		fmt.Printf("Warning: Could not extract categories: %v\n", err)
		availableCategories = []string{}
	}

	title := promptUser("Enter post title: ")
	if title == "" {
		fmt.Println("Error: Title is required")
		os.Exit(1)
	}

	defaultDate := time.Now().Format("2006-01-02 15:04:05")
	fmt.Printf("Enter date (default: %s): ", defaultDate)
	dateInput := promptUser("")
	if dateInput == "" {
		dateInput = defaultDate
	}

	tagsInput := promptUser("Enter tags (comma-separated): ")
	tags := []string{}
	if tagsInput != "" {
		for _, tag := range strings.Split(tagsInput, ",") {
			tags = append(tags, strings.TrimSpace(tag))
		}
	}

	selectedCategories := selectCategories(availableCategories)

	frontmatter := generateFrontmatter(title, dateInput, tags, selectedCategories)

	date, err := time.Parse("2006-01-02 15:04:05", dateInput)
	if err != nil {
		fmt.Printf("Warning: Could not parse date, using current date for filename\n")
		date = time.Now()
	}

	datePrefix := date.Format("2006-01-02")
	slug := slugify(title)
	filename := fmt.Sprintf("%s-%s.md", datePrefix, slug)
	filepath := filepath.Join(blogDir, filename)

	content := frontmatter + "\n"
	err = os.WriteFile(filepath, []byte(content), 0644)
	if err != nil {
		fmt.Printf("Error creating file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\n✓ Blog post created successfully!\n")
	fmt.Printf("  Location: %s\n", filepath)
	fmt.Printf("\nYou can now open this file and start writing your blog post!\n")
}

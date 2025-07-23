import os

def _generate_tree_recursive(
    current_path,
    project_root_path,
    prefix,
    ignore_dirs,
    ignore_extensions,
    ignore_files,
    output_file_name_to_ignore,
    is_last_call=False, # Helps with the root prefix
):
    """
    Recursively generates a directory tree structure as a list of strings.
    """
    tree_lines = []
    try:
        all_items_in_dir = sorted(os.listdir(current_path))
    except OSError: # Handle potential permission errors, etc.
        tree_lines.append(f"{prefix}└── [Error reading directory: {os.path.basename(current_path)}]")
        return tree_lines

    valid_items = []
    for item_name in all_items_in_dir:
        item_path = os.path.join(current_path, item_name)
        # Use normalized relative path for ignore checks if it's in ignore_files
        relative_item_path = os.path.relpath(
            item_path, project_root_path
        ).replace(os.sep, "/")

        if item_name == output_file_name_to_ignore:
            continue
        if (
            item_name in ignore_files
            or relative_item_path in ignore_files
        ):
            continue

        is_dir = os.path.isdir(item_path)
        if is_dir and item_name in ignore_dirs:
            continue
        if not is_dir and any(
            item_name.endswith(ext) for ext in ignore_extensions
        ):
            continue

        valid_items.append(item_name)

    for i, item_name in enumerate(valid_items):
        item_path = os.path.join(current_path, item_name)
        is_last_item_in_list = i == len(valid_items) - 1
        
        # Adjust connector based on whether it's the very first call for the root
        if prefix == "" and is_last_call: # For the single root directory entry
             connector = ""
        elif is_last_item_in_list:
            connector = "└── "
        else:
            connector = "├── "

        if os.path.isdir(item_path):
            tree_lines.append(f"{prefix}{connector}{item_name}/")
            new_prefix = prefix + ("    " if is_last_item_in_list else "│   ")
            tree_lines.extend(
                _generate_tree_recursive(
                    item_path,
                    project_root_path,
                    new_prefix,
                    ignore_dirs,
                    ignore_extensions,
                    ignore_files,
                    output_file_name_to_ignore,
                )
            )
        else:  # It's a file
            tree_lines.append(f"{prefix}{connector}{item_name}")

    return tree_lines

def bundle_project_to_text(
    project_path,
    output_file,
    ignore_dirs=None,
    ignore_extensions=None,
    ignore_files=None,
):
    if ignore_dirs is None:
        ignore_dirs = [".git", "node_modules"]
    if ignore_extensions is None:
        ignore_extensions = [".log", ".tmp", ".env"]
    if ignore_files is None:
        ignore_files = []

    # Ensure the output file itself is in the ignore_files list for the tree
    output_file_name_only = os.path.basename(output_file)
    temp_ignore_files_for_tree = list(ignore_files) # Create a copy
    if output_file_name_only not in temp_ignore_files_for_tree:
        temp_ignore_files_for_tree.append(output_file_name_only)
    # Also ignore the bundler script itself by name if it's in the project dir
    # (Assuming your bundler script is named 'bundler.py' as per previous context)
    # You already have "bundler.py" in your main ignore_files_list, which is good.

    with open(output_file, "w", encoding="utf-8") as outfile:
        # --- SNIPPET TO ADD STARTS HERE ---
        outfile.write("--- PROJECT STRUCTURE ---\n")
        
        # Get the actual name of the project directory for the root of the tree
        abs_project_path = os.path.abspath(project_path)
        project_dir_name = os.path.basename(abs_project_path)
        if not project_dir_name: # Handle case where project_path is "./" and abspath is root
            project_dir_name = os.path.basename(os.getcwd())
        
        outfile.write(f"{project_dir_name}/\n") # Display root project folder

        tree_lines_list = _generate_tree_recursive(
            abs_project_path,  # Start recursion from the absolute project path
            abs_project_path,  # Root path for relative calculations
            "    ", # Initial prefix for items under the root dir name
            ignore_dirs,
            ignore_extensions,
            temp_ignore_files_for_tree, # Use the temp list that includes output file
            output_file_name_only, # Pass output file name to ignore explicitly
        )
        for line in tree_lines_list:
            outfile.write(line + "\n")
        outfile.write("--- END PROJECT STRUCTURE ---\n\n")
        # --- SNIPPET TO ADD ENDS HERE ---

        # The rest of your existing code for walking files and writing content:
        for root, dirs, files in os.walk(project_path):
            # Filter out ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs]

            for file_name in files:
                file_path = os.path.join(root, file_name)
                relative_path = os.path.relpath(
                    file_path, project_path
                ).replace(
                    os.sep, "/"
                )  # Normalize path separators

                # Skip if file is the output file itself
                if os.path.abspath(file_path) == os.path.abspath(
                    output_file
                ):
                    continue

                # Skip ignored files (check by relative path or just name)
                if (
                    file_name in ignore_files
                    or relative_path in ignore_files
                ):
                    # print(f"Skipping {relative_path} as it's in ignore_files list for content.") # Optional: keep if you want this log
                    continue

                # Skip ignored extensions
                if any(
                    file_name.endswith(ext) for ext in ignore_extensions
                ):
                    # print(f"Skipping {relative_path} due to extension for content.") # Optional
                    continue

                try:
                    with open(
                        file_path, "r", encoding="utf-8", errors="ignore"
                    ) as infile:
                        content = infile.read()
                        outfile.write(
                            f"--- START FILE: {relative_path} ---\n"
                        )
                        outfile.write(content)
                        outfile.write(
                            f"\n--- END FILE: {relative_path} ---\n\n"
                        )
                    # print(f"Processed for content: {relative_path}") # Optional
                except Exception as e:
                    outfile.write(
                        f"--- ERROR READING FILE FOR CONTENT: {relative_path} ({e}) ---\n\n"
                    )
                    # print(f"Error reading {relative_path} for content: {e}") # Optional

    print(f"Project bundled into {output_file}")


if __name__ == "__main__":
    project_directory = "./"  # Current directory
    output_text_file = "./bundled_code.txt"
    ignored_dirs_list = [
        ".git",
        "node_modules",
        ".venv",
        ".idea",
        "dist",
        "build",
        "__pycache__",

    ]
    ignored_ext_list = [
        ".log",
        ".env",
        ".sqlite",
        ".db",
        ".tmp",
        ".bak",
        ".zip",
        ".tar.gz",
        ".pyc",
        ".swp", # Vim swap files
        ".DS_Store", # macOS
        ".exe",
        ".dll",
        ".o", # Object files
        ".so", # Shared object files
        ".class", # Java class files
        ".jar", # Java archives
        ".json",
        ".png",
        ".db",
        ".sh"
    ]
    # Add specific file names or relative paths to ignore
    ignored_files_list = [
        "bundled_code.txt", # Don't include the output file itself!
        "bundler.py",
        ".gitignore",
        ".gitattributes",
        "app.yaml",
    ]

    # Make sure the output file itself is in the ignore_files_list
    # by its name if running from the project root.
    output_file_name_only = os.path.basename(output_text_file)
    if output_file_name_only not in ignored_files_list:
        ignored_files_list.append(output_file_name_only)


    bundle_project_to_text(
        project_directory,
        output_text_file,
        ignored_dirs_list,
        ignored_ext_list,
        ignored_files_list, # Pass the new list
    )

#!/bin/sh

# downloadAndExtractTarball.sh
# Downloads a tarball from URL, extracts it, and copies contents to destination folder
#
# Usage: ./downloadAndExtractTarball.sh <url> <destination_folder> [tmp_dir] [--dry-run]
#   url: The URL of the tarball to download
#   destination_folder: The folder to copy the extracted contents to
#   tmp_dir: Optional temporary directory (defaults to ./tmp)
#   --dry-run: Optional flag to simulate execution without actual operations
#
# Exit codes:
#   0: Success
#   1: Invalid arguments
#   2: Failed to create directories
#   3: Failed to download tarball
#   4: Failed to extract tarball
#   5: No contents found in extracted tarball
#   6: Failed to copy files
#   7: Failed to cleanup temporary files

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Global variable for cleanup
CLEANUP_TMP_DIR=""

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_dry_run() {
    echo -e "${PURPLE}🔍 [DRY RUN] $1${NC}"
}

# Show help
show_help() {
    cat << EOF
downloadAndExtractTarball.sh - Download and extract tarball to destination

Usage: $0 <url> <destination_folder> [tmp_dir] [--dry-run]

Arguments:
  url                 The URL of the tarball to download
  destination_folder  The folder to copy the extracted contents to
  tmp_dir            Optional temporary directory (defaults to ./tmp)
  --dry-run          Optional flag to simulate execution without actual operations

Examples:
  $0 https://example.com/file.tar.gz ./output
  $0 https://example.com/file.tar.gz ./output ./custom-tmp
  $0 https://example.com/file.tar.gz ./output ./tmp --dry-run

Exit codes:
  0: Success
  1: Invalid arguments
  2: Failed to create directories
  3: Failed to download tarball
  4: Failed to extract tarball
  5: No contents found in extracted tarball
  6: Failed to copy files
  7: Failed to cleanup temporary files

EOF
}

# Cleanup function
cleanup() {
    local tmp_dir="$1"
    local dry_run="$2"
    
    if [ "$dry_run" = "true" ]; then
        log_dry_run "Would clean up temporary directory: $tmp_dir"
        return 0
    fi
    
    if [ -n "$tmp_dir" ] && [ -d "$tmp_dir" ]; then
        log_info "Cleaning up temporary directory: $tmp_dir"
        rm -rf "$tmp_dir" 2>/dev/null || {
            log_warning "Could not clean up tmp directory: $tmp_dir"
            return 1
        }
        log_success "Cleanup completed"
    fi
}

# Main function
main() {
    local url=""
    local destination_folder=""
    local tmp_dir="./tmp"
    local dry_run="false"
    
    # Parse arguments
    local i=1
    while [ $i -le $# ]; do
        eval arg=\${$i}
        if [ "$arg" = "--dry-run" ]; then
            dry_run="true"
        elif [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
            show_help
            exit 0
        elif [ -z "$url" ]; then
            url="$arg"
        elif [ -z "$destination_folder" ]; then
            destination_folder="$arg"
        elif [ "$tmp_dir" = "./tmp" ]; then
            tmp_dir="$arg"
        fi
        i=$((i+1))
    done
    
    # Validate required arguments
    if [ -z "$url" ]; then
        log_error "URL is required"
        show_help
        exit 1
    fi
    
    if [ -z "$destination_folder" ]; then
        log_error "Destination folder is required"
        show_help
        exit 1
    fi
    
    if [ "$dry_run" = "true" ]; then
        log_dry_run "Would download tarball from: $url"
        log_dry_run "Would extract to destination: $destination_folder"
        log_dry_run "Would use temporary directory: $tmp_dir"
        log_dry_run "Simulating successful download and extraction"
        log_success "[DRY RUN] Successfully downloaded and extracted to: $destination_folder"
        exit 0
    fi
    
    # Set global cleanup variable
    CLEANUP_TMP_DIR="$tmp_dir"
    
    # Create temporary directory
    log_info "Creating temporary directory: $tmp_dir"
    if ! mkdir -p "$tmp_dir"; then
        log_error "Failed to create temporary directory: $tmp_dir"
        exit 2
    fi
    
    local tmp_download_path="$tmp_dir/download.tar.gz"
    local tmp_extract_path="$tmp_dir/extracted"
    
    # Download the tarball
    log_info "Downloading tarball from: $url"
    if ! wget -q -O "$tmp_download_path" "$url"; then
        log_error "Failed to download tarball from: $url"
        cleanup "$tmp_dir" "false"
        exit 3
    fi
    
    # Check if download was successful
    if [ ! -f "$tmp_download_path" ] || [ ! -s "$tmp_download_path" ]; then
        log_error "Downloaded file is empty or missing: $tmp_download_path"
        cleanup "$tmp_dir" "false"
        exit 3
    fi
    
    log_success "Download completed: $(du -h "$tmp_download_path" | cut -f1)"
    
    # Create extraction directory
    log_info "Creating extraction directory: $tmp_extract_path"
    if ! mkdir -p "$tmp_extract_path"; then
        log_error "Failed to create extraction directory: $tmp_extract_path"
        cleanup "$tmp_dir" "false"
        exit 2
    fi
    
    # Extract the tarball
    log_info "Extracting tarball to: $tmp_extract_path"
    if ! tar -xzf "$tmp_download_path" -C "$tmp_extract_path"; then
        log_error "Failed to extract tarball"
        cleanup "$tmp_dir" "false"
        exit 4
    fi
    
    # Check if extraction was successful - use simple shell approach
    local item_count=0
    local first_item=""
    
    # Use ls to safely list items
    if [ -d "$tmp_extract_path" ]; then
        for item in "$tmp_extract_path"/*; do
            if [ -e "$item" ] && [ "$item" != "$tmp_extract_path/*" ]; then
                item_count=$((item_count + 1))
                if [ -z "$first_item" ]; then
                    first_item="$item"
                fi
            fi
        done
    fi
    
    if [ $item_count -eq 0 ]; then
        log_error "No contents found in extracted tarball"
        cleanup "$tmp_dir" "false"
        exit 5
    fi
    
    log_info "Found $item_count items in extracted tarball"
    
    # Determine what to copy
    local source_path="$tmp_extract_path"
    if [ $item_count -eq 1 ]; then
        if [ -d "$first_item" ]; then
            source_path="$first_item"
            log_info "Using extracted directory: $first_item"
        else
            log_info "Using extracted file: $first_item"
        fi
    else
        log_info "Using extracted directory contents: $tmp_extract_path"
    fi
    
    # Create destination directory
    log_info "Creating destination directory: $destination_folder"
    if ! mkdir -p "$destination_folder"; then
        log_error "Failed to create destination directory: $destination_folder"
        cleanup "$tmp_dir" "false"
        exit 2
    fi
    
    # Copy contents to destination
    log_info "Copying contents to: $destination_folder"
    if ! cp -r "$source_path"/* "$destination_folder"/ 2>/dev/null; then
        log_error "Failed to copy files to destination"
        cleanup "$tmp_dir" "false"
        exit 6
    fi
    
    log_success "Successfully copied contents to: $destination_folder"
    
    # Cleanup
    cleanup "$tmp_dir" "false"
    
    log_success "Operation completed successfully"
    exit 0
}

# Trap to ensure cleanup on exit
trap 'cleanup "$CLEANUP_TMP_DIR" "false"' EXIT

# Run main function with all arguments
main "$@"

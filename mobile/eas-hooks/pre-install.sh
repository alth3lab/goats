#!/bin/bash
# Fix directory permissions that get corrupted by OneDrive NTFS ACLs
chmod -R u+rwX .
echo " Fixed directory permissions\n
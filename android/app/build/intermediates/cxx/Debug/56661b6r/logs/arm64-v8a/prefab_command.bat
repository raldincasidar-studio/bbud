@echo off
"C:\\Program Files\\Java\\jdk-17\\bin\\java" ^
  --class-path ^
  "C:\\Users\\Raldin Casidar\\.gradle\\caches\\modules-2\\files-2.1\\com.google.prefab\\cli\\2.1.0\\aa32fec809c44fa531f01dcfb739b5b3304d3050\\cli-2.1.0-all.jar" ^
  com.google.prefab.cli.AppKt ^
  --build-system ^
  cmake ^
  --platform ^
  android ^
  --abi ^
  arm64-v8a ^
  --os-version ^
  24 ^
  --stl ^
  c++_shared ^
  --ndk-version ^
  27 ^
  --output ^
  "C:\\Users\\RALDIN~1\\AppData\\Local\\Temp\\agp-prefab-staging16335540051121702551\\staged-cli-output" ^
  "C:\\Users\\Raldin Casidar\\.gradle\\caches\\8.13\\transforms\\aa25acb041d3c941c61c41fc8b8c8466\\transformed\\react-android-0.79.5-debug\\prefab" ^
  "C:\\Users\\Raldin Casidar\\Desktop\\Desktops\\B-Bud-Compile\\bbud\\android\\app\\build\\intermediates\\cxx\\refs\\react-native-reanimated\\1f464j42" ^
  "C:\\Users\\Raldin Casidar\\.gradle\\caches\\8.13\\transforms\\3ec862d63fdddbd4f01d7183afe68cc6\\transformed\\hermes-android-0.79.5-debug\\prefab" ^
  "C:\\Users\\Raldin Casidar\\.gradle\\caches\\8.13\\transforms\\2a9b8162c1a6cb37e3240286c567bff3\\transformed\\fbjni-0.7.0\\prefab"

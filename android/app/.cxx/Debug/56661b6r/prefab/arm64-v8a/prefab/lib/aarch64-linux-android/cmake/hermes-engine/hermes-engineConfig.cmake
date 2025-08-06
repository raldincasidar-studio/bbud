if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/Raldin Casidar/.gradle/caches/8.13/transforms/3ec862d63fdddbd4f01d7183afe68cc6/transformed/hermes-android-0.79.5-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Raldin Casidar/.gradle/caches/8.13/transforms/3ec862d63fdddbd4f01d7183afe68cc6/transformed/hermes-android-0.79.5-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()


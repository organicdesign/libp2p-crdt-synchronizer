## [0.4.1](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.4.0...v0.4.1) (2023-02-14)

### Fixed

* Updated packages.
* Moved synchronizer and handler from cosntructor to start.

## [0.4.0](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.3.1...v0.4.0) (2023-02-09)

### Changed

* Updated system to `@organicdesign/crdt-interfaces@4.0.0` and refactored protocol into separate package.

## [0.3.1](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.3.0...v0.3.1) (2023-02-02)

### Fixed

* Fixed security vulnerabilities in packages.

## [0.3.0](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.2.2...v0.3.0) (2023-01-20)

### Changed

* Updated libp2p-message-handler to 0.4.1.

## [0.2.2](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.2.1...v0.2.2) (2023-01-19)

### Added

* Implmented the startable interface.
* Tests:
  * Starable interface.
  * CRDT getting/setting.
  * Synchronization.

### Changed

* Changed the general logger namespace.

### Fixed

* Fix multiple start calls throwing errors.
* Fix dynamic return type of public methods.

## [0.2.1](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.2.0...v0.2.1) (2023-01-17)

### Fixed

* Fix format issue in readme.

## [0.2.0](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.1.3...v0.2.0) (2023-01-17)

### Added

* Add logger.

## [0.1.3](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.1.2...v0.1.3) (2023-01-17)

### Added

* Add keywords to package.json.
* Add table of contents to readme.

## [0.1.2](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.1.1...v0.1.2) (2023-01-16)

### Fixed

* Fixed typo in readme.

## [0.1.1](https://github.com/organicdesign/libp2p-crdt-synchronizer/compare/v0.1.0...v0.1.1) (2023-01-16)

### Added

* Added API & TODO sections to readme.

### Changed

* Refactored message handling using `@organicdesign/libp2p-message-handler`.

## 0.1.0 (2023-01-12)

### Added

* Synchronize CRDTs over libp2p.

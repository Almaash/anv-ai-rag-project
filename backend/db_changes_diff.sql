-- Allow duplicate city_number values in branch_cities.
-- Application validation was also updated to remove city_number uniqueness.
ALTER TABLE `branch_cities`
	DROP INDEX `branch_cities_city_number_unique`;

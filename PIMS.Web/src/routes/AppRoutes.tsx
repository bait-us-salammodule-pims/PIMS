import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { HeadOfficesPage } from '../pages/organization/HeadOfficesPage';
import { BranchesPage } from '../pages/organization/BranchesPage';
import { DepartmentsPage } from '../pages/organization/DepartmentsPage';
import { SubDepartmentsPage } from '../pages/organization/SubDepartmentsPage';
import { StoresPage } from '../pages/stores/StoresPage';
import { StoreLocationsPage } from '../pages/stores/StoreLocationsPage';
import { ItemCategoriesPage } from '../pages/items/ItemCategoriesPage';
import { ItemsMasterPage } from '../pages/items/ItemsMasterPage';
import { UnitsOfMeasurePage } from '../pages/items/UnitsOfMeasurePage';
import { PackageTypesPage } from '../pages/items/PackageTypesPage';
import { ItemPricingPage } from '../pages/items/ItemPricingPage';
import { VendorsDirectoryPage } from '../pages/vendors/VendorsDirectoryPage';
import { VendorContactsPage } from '../pages/vendors/VendorContactsPage';
import { VendorItemPricingPage } from '../pages/vendors/VendorItemPricingPage';
import { PurchaseRequestsPage } from '../pages/procurement/PurchaseRequestsPage';
import { QuotationsPage } from '../pages/procurement/QuotationsPage';
import { PurchaseOrdersPage } from '../pages/procurement/PurchaseOrdersPage';
import { GoodsReceiptsPage } from '../pages/receiving/GoodsReceiptsPage';
import { InventoryBalancesPage } from '../pages/inventory/InventoryBalancesPage';
import { StockMovementsPage } from '../pages/inventory/StockMovementsPage';
import { StockTransfersPage } from '../pages/inventory/StockTransfersPage';
import { UsersListPage } from '../pages/users/UsersListPage';
import { RolesPermissionsPage } from '../pages/users/RolesPermissionsPage';
import { UserStoreAssignmentsPage } from '../pages/users/UserStoreAssignmentsPage';
import { TabsAccessPage } from '../pages/users/TabsAccessPage';

const permissionRoute = (permission: string, element: React.ReactElement) => (
  <ProtectedRoute requiredPermission={permission}>{element}</ProtectedRoute>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes wrapped in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route path="dashboard" element={permissionRoute('DashboardView', <DashboardPage />)} />

        {/* Procurement Module */}
        <Route path="procurement" element={<Navigate to="/procurement/requests" replace />} />
        <Route path="procurement/requests" element={permissionRoute('PurchaseRequestView', <PurchaseRequestsPage />)} />
        <Route path="procurement/quotations" element={permissionRoute('QuotationView', <QuotationsPage />)} />
        <Route path="procurement/orders" element={permissionRoute('PurchaseOrderView', <PurchaseOrdersPage />)} />

        {/* Receiving Module */}
        <Route path="receiving" element={<Navigate to="/receiving/goods-receipts" replace />} />
        <Route path="receiving/goods-receipts" element={permissionRoute('ReceivingView', <GoodsReceiptsPage />)} />

        {/* Inventory Module */}
        <Route path="inventory" element={<Navigate to="/inventory/balances" replace />} />
        <Route path="inventory/balances" element={permissionRoute('InventoryView', <InventoryBalancesPage />)} />
        <Route path="inventory/movements" element={permissionRoute('InventoryView', <StockMovementsPage />)} />
        <Route path="inventory/transfers" element={permissionRoute('InventoryTransfer', <StockTransfersPage />)} />

        {/* Stores Module */}
        <Route path="stores" element={<Navigate to="/stores/list" replace />} />
        <Route path="stores/list" element={permissionRoute('StoreView', <StoresPage />)} />
        <Route path="stores/locations" element={permissionRoute('StoreView', <StoreLocationsPage />)} />

        {/* Items Module */}
        <Route path="items" element={<Navigate to="/items/catalog" replace />} />
        <Route path="items/catalog" element={permissionRoute('ItemView', <ItemsMasterPage />)} />
        <Route path="items/categories" element={permissionRoute('ItemView', <ItemCategoriesPage />)} />
        <Route path="items/pricing" element={permissionRoute('ItemView', <ItemPricingPage />)} />
        <Route path="items/units" element={permissionRoute('ItemView', <UnitsOfMeasurePage />)} />
        <Route path="items/package-types" element={permissionRoute('ItemView', <PackageTypesPage />)} />

        {/* Vendors Module */}
        <Route path="vendors" element={<Navigate to="/vendors/directory" replace />} />
        <Route path="vendors/directory" element={permissionRoute('VendorView', <VendorsDirectoryPage />)} />
        <Route path="vendors/contacts" element={permissionRoute('VendorView', <VendorContactsPage />)} />
        <Route path="vendors/pricing" element={permissionRoute('VendorView', <VendorItemPricingPage />)} />

        {/* Organization Module */}
        <Route path="organization" element={<Navigate to="/organization/branches" replace />} />
        <Route path="organization/head-offices" element={permissionRoute('OrganizationView', <HeadOfficesPage />)} />
        <Route path="organization/branches" element={permissionRoute('OrganizationView', <BranchesPage />)} />
        <Route path="organization/departments" element={permissionRoute('OrganizationView', <DepartmentsPage />)} />
        <Route path="organization/sub-departments" element={permissionRoute('OrganizationView', <SubDepartmentsPage />)} />

        {/* Users & Access Module */}
        <Route path="users" element={<Navigate to="/users/list" replace />} />
        <Route path="users/list" element={permissionRoute('UserView', <UsersListPage />)} />
        <Route path="users/roles" element={permissionRoute('RoleView', <RolesPermissionsPage />)} />
        <Route path="users/store-assignments" element={permissionRoute('StoreManage', <UserStoreAssignmentsPage />)} />
        <Route path="users/tabs" element={permissionRoute('SystemConfigurationView', <TabsAccessPage />)} />

        {/* Catch-all route within layout */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

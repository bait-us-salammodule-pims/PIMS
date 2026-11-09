namespace PIMS.Domain.Common;

public interface IAuditableEntity
{
    int? CreatedBy { get; set; }

    int? UpdatedBy { get; set; }
}